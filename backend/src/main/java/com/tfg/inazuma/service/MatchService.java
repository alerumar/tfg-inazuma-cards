package com.tfg.inazuma.service;

import com.tfg.inazuma.dto.CardStateDto;
import com.tfg.inazuma.dto.MatchResponse;
import com.tfg.inazuma.dto.MatchStateResponse;
import com.tfg.inazuma.dto.PersonResponse;
import com.tfg.inazuma.dto.TurnStateDto;
import com.tfg.inazuma.model.*;
import com.tfg.inazuma.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchService {

    private static final int XP_WIN   = 200;
    private static final int XP_DRAW  = 100;
    private static final int XP_LOSS  = 50;
    private static final int PTS_WIN  = 6;
    private static final int PTS_DRAW = 4;
    private static final int PTS_LOSS = 2;
    private static final int POINTS_ON_LEVEL = 12;
    private static final int XP_PER_LEVEL    = 200;
    private static final int XP_INCREMENT    = 100;

    private static final int  ROUNDS_TO_WIN       = 3;
    private static final int  TURN_WINS_PER_ROUND = 2;
    private static final long TURN_TIMEOUT_SECONDS = 45;

    private final MatchRepository         matchRepo;
    private final MatchRoundRepository    roundRepo;
    private final MatchTurnRepository     turnRepo;
    private final MatchPlayerRepository   matchPlayerRepo;
    private final MatchTurnMoveRepository turnMoveRepo;
    private final PersonRepository        personRepo;
    private final DeckRepository          deckRepo;
    private final DeckCardRepository      deckCardRepo;
    private final MissionService          missionService;


    @Transactional
    public MatchResponse invitePlayer(Long initiatorId, Long receiverId) {
        Person initiator = findPerson(initiatorId);
        Person receiver  = findPerson(receiverId);

        if (initiatorId.equals(receiverId))
            throw new IllegalArgumentException("No puedes invitarte a ti mismo");
        if (!matchRepo.findActiveForPerson(initiator).isEmpty())
            throw new IllegalStateException("Ya tienes una partida activa");
        if (!matchRepo.findActiveForPerson(receiver).isEmpty())
            throw new IllegalStateException(receiver.getNickname() + " ya tiene una partida activa");

        Match match = new Match();
        match.setPlayer1(initiator);
        match.setPlayer2(receiver);
        match.setStatus(MatchStatus.PENDING_INVITE);
        match.setCreatedAt(LocalDateTime.now());
        matchRepo.save(match);

        MatchPlayer mp1 = new MatchPlayer(match, initiator);
        MatchPlayer mp2 = new MatchPlayer(match, receiver);
        matchPlayerRepo.saveAll(List.of(mp1, mp2));

        return MatchResponse.from(match, mp1, mp2);
    }

    @Transactional
    public MatchResponse respondInvite(Long matchId, Long receiverId, boolean accept) {
        Match match = findMatch(matchId);

        if (match.getStatus() != MatchStatus.PENDING_INVITE)
            throw new IllegalStateException("La invitación ya no está pendiente");
        if (!match.getPlayer2().getId().equals(receiverId))
            throw new IllegalArgumentException("No eres el receptor de esta invitación");

        if (accept) {
            match.setStatus(MatchStatus.WAITING_READY);
            LocalDateTime now = LocalDateTime.now();
            List<MatchPlayer> players = matchPlayerRepo.findByMatch(match);
            players.forEach(mp -> mp.setLastActivity(now));
            matchPlayerRepo.saveAll(players);
        } else {
            match.setStatus(MatchStatus.REJECTED);
        }

        matchRepo.save(match);

        MatchPlayer mp1 = findMatchPlayer(match, match.getPlayer1().getId());
        MatchPlayer mp2 = findMatchPlayer(match, match.getPlayer2().getId());
        return MatchResponse.from(match, mp1, mp2);
    }

    @Transactional
    public MatchResponse cancelMatch(Long matchId, Long playerId) {
        Match match = findMatch(matchId);

        if (match.getStatus() != MatchStatus.PENDING_INVITE
                && match.getStatus() != MatchStatus.WAITING_READY)
            throw new IllegalStateException("Solo se puede cancelar antes de empezar la partida");
        if (!match.getPlayer1().getId().equals(playerId)
                && !match.getPlayer2().getId().equals(playerId))
            throw new IllegalArgumentException("No eres participante de esta partida");

        match.setStatus(MatchStatus.CANCELLED);
        matchRepo.save(match);

        MatchPlayer mp1 = findMatchPlayer(match, match.getPlayer1().getId());
        MatchPlayer mp2 = findMatchPlayer(match, match.getPlayer2().getId());
        return MatchResponse.from(match, mp1, mp2);
    }

    @Transactional
    public MatchStateResponse setReady(Long matchId, Long playerId, Long deckId) {
        Match match = findMatchForUpdate(matchId);

        if (match.getStatus() == MatchStatus.IN_PROGRESS) {
            return buildState(match);
        }
        if (match.getStatus() != MatchStatus.WAITING_READY)
            throw new IllegalStateException("La partida no está en fase de lobby");

        Deck deck = deckRepo.findById(deckId)
                .orElseThrow(() -> new IllegalArgumentException("Baraja no encontrada"));
        if (!deck.getPerson().getId().equals(playerId))
            throw new IllegalArgumentException("Esta baraja no te pertenece");
        if (deckCardRepo.countByDeck(deck) != 5)
            throw new IllegalArgumentException("La baraja debe tener exactamente 5 cartas");

        MatchPlayer me = findMatchPlayer(match, playerId);
        me.setDeck(deck);
        me.setReady(true);
        matchPlayerRepo.save(me);

        List<MatchPlayer> allPlayers = matchPlayerRepo.findByMatch(match);
        boolean allReady = allPlayers.stream().allMatch(MatchPlayer::isReady);

        if (allReady) {
            match.setStatus(MatchStatus.IN_PROGRESS);
            LocalDateTime now = LocalDateTime.now();
            allPlayers.forEach(mp -> mp.setLastActivity(now));
            matchPlayerRepo.saveAll(allPlayers);
            matchRepo.save(match);
            createNextRoundAndTurn(match, 1);
        } else {
            matchRepo.save(match);
        }

        return buildState(match);
    }

    @Transactional
    public MatchStateResponse unsetReady(Long matchId, Long playerId) {
        Match match = findMatchForUpdate(matchId);

        if (match.getStatus() != MatchStatus.WAITING_READY)
            throw new IllegalStateException("La partida no está en fase de lobby");

        MatchPlayer me = findMatchPlayer(match, playerId);
        me.setReady(false);
        me.setDeck(null);
        matchPlayerRepo.save(me);

        return buildState(matchRepo.save(match));
    }


    @Transactional
    public MatchStateResponse submitMove(Long matchId, Long playerId,
                                         Long cardId, CardAttribute attribute) {

        Match match = findMatchForUpdate(matchId);

        if (match.getStatus() != MatchStatus.IN_PROGRESS)
            throw new IllegalStateException("La partida no está en curso");

        MatchPlayer me = findMatchPlayer(match, playerId);

        MatchRound round = currentRound(match);
        List<MatchTurn> pendingTurns = turnRepo.findPendingByRoundForUpdate(round, TurnResult.PENDING);
        MatchTurn turn = pendingTurns.isEmpty() ? null : pendingTurns.get(0);
        if (turn == null)
            throw new IllegalStateException("No hay turno pendiente");

        if (turnMoveRepo.existsByTurnAndPlayer(turn, me.getPlayer()))
            throw new IllegalStateException("Ya has enviado tu jugada para este turno");

        Card card = findCardInDeck(me.getDeck(), cardId);

        List<MatchTurnMove> completedMoves = turnMoveRepo.findAllCompletedByMatch(match);

        Set<CardAttribute> usedForCard = usedAttributesForCard(completedMoves, playerId, card);
        if (usedForCard.contains(attribute))
            throw new IllegalArgumentException("Ya usaste ese atributo de esa carta");

        if (card.getType() == CardType.LEGEND && me.getConsecutiveLegend() >= 2) {
            boolean hasNonLegendAvailable = deckCardRepo.findByDeck(me.getDeck()).stream()
                    .filter(dc -> dc.getCard().getType() != CardType.LEGEND)
                    .anyMatch(dc -> usedAttributesForCard(completedMoves, playerId, dc.getCard()).size() < 3);
            if (hasNonLegendAvailable)
                throw new IllegalArgumentException(
                        "No puedes usar una carta Legend tres turnos consecutivos");
        }

        LocalDateTime now = LocalDateTime.now();
        MatchTurnMove move = new MatchTurnMove();
        move.setTurn(turn);
        move.setPlayer(me.getPlayer());
        move.setCard(card);
        move.setAttribute(attribute);
        move.setSubmittedAt(now);
        turnMoveRepo.save(move);

        me.setLastActivity(now);
        matchPlayerRepo.save(me);

        if (turn.getResult() != TurnResult.PENDING) {
            log.info("submitMove matchId={} playerId={}: turno {} ya resuelto",
                    matchId, playerId, turn.getId());
            return buildState(match);
        }

        List<MatchTurnMove> turnMoves  = turnMoveRepo.findByTurn(turn);
        List<MatchPlayer>   allPlayers = matchPlayerRepo.findByMatch(match);
        boolean bothSubmitted = allPlayers.stream()
                .allMatch(mp -> turnMoves.stream()
                        .anyMatch(m -> m.getPlayer().getId().equals(mp.getPlayer().getId())));

        log.info("submitMove matchId={} playerId={} turnId={}: moves={} players={} bothSubmitted={}",
                matchId, playerId, turn.getId(), turnMoves.size(), allPlayers.size(), bothSubmitted);

        if (bothSubmitted) {
            resolveTurn(match, round, turn, turnMoves);
        } else {
            matchRepo.save(match);
        }

        return buildState(match);
    }

    @Transactional
    public void heartbeat(Long matchId, Long playerId) {
        Match match = findMatch(matchId);
        if (match.getStatus() != MatchStatus.IN_PROGRESS) return;
        MatchPlayer me = findMatchPlayer(match, playerId);
        me.setLastActivity(LocalDateTime.now());
        matchPlayerRepo.save(me);
    }

    @Transactional
    public MatchStateResponse forfeit(Long matchId, Long playerId) {
        Match match = findMatch(matchId);
        if (match.getStatus() != MatchStatus.IN_PROGRESS)
            throw new IllegalStateException("La partida no está en curso");

        MatchPlayer opponent = matchPlayerRepo.findByMatch(match).stream()
                .filter(mp -> !mp.getPlayer().getId().equals(playerId))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No se encontró al oponente"));

        match.setWonByAbandon(true);
        finishMatch(match, opponent.getPlayer());
        return buildState(match);
    }

    @Transactional
    public MatchStateResponse voteRematch(Long matchId, Long playerId, boolean wants) {
        Match match = findMatch(matchId);

        if (match.getStatus() != MatchStatus.FINISHED)
            throw new IllegalStateException("La partida no ha terminado");

        List<MatchPlayer> allPlayers = matchPlayerRepo.findByMatch(match);

        if (!wants) {
            allPlayers.forEach(mp -> mp.setWantsRematch(false));
            matchPlayerRepo.saveAll(allPlayers);
            match.setRematchMatchId(null);
            matchRepo.save(match);
            return buildState(match);
        }

        MatchPlayer me = allPlayers.stream()
                .filter(mp -> mp.getPlayer().getId().equals(playerId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No eres participante de esta partida"));

        me.setWantsRematch(true);
        matchPlayerRepo.save(me);

        boolean allWantRematch = allPlayers.stream().allMatch(MatchPlayer::isWantsRematch);

        if (allWantRematch && match.getRematchMatchId() == null) {
            Match rematch = new Match();
            rematch.setPlayer1(match.getPlayer1());
            rematch.setPlayer2(match.getPlayer2());
            rematch.setStatus(MatchStatus.WAITING_READY);
            rematch.setCreatedAt(LocalDateTime.now());
            matchRepo.save(rematch);

            LocalDateTime now = LocalDateTime.now();
            MatchPlayer rmp1 = new MatchPlayer(rematch, match.getPlayer1());
            rmp1.setLastActivity(now);
            MatchPlayer rmp2 = new MatchPlayer(rematch, match.getPlayer2());
            rmp2.setLastActivity(now);
            matchPlayerRepo.saveAll(List.of(rmp1, rmp2));

            match.setRematchMatchId(rematch.getId());
        }

        matchRepo.save(match);
        return buildState(match);
    }

    @Transactional
    public MatchStateResponse getState(Long matchId) {
        Match match = findMatch(matchId);

        if (match.getStatus() == MatchStatus.WAITING_READY) {
            List<MatchPlayer> players = matchPlayerRepo.findByMatch(match);
            if (players.stream().allMatch(MatchPlayer::isReady)) {
                match = findMatchForUpdate(matchId);
                players = matchPlayerRepo.findByMatch(match);
                if (match.getStatus() == MatchStatus.WAITING_READY
                        && players.stream().allMatch(MatchPlayer::isReady)) {
                    match.setStatus(MatchStatus.IN_PROGRESS);
                    LocalDateTime now = LocalDateTime.now();
                    players.forEach(mp -> mp.setLastActivity(now));
                    matchPlayerRepo.saveAll(players);
                    matchRepo.save(match);
                    createNextRoundAndTurn(match, 1);
                }
            }
        }

        return buildState(match);
    }


    public List<MatchResponse> getActive(Long personId) {
        Person p = findPerson(personId);
        return matchRepo.findActiveForPerson(p).stream()
                .map(m -> MatchResponse.from(m,
                        findMatchPlayer(m, m.getPlayer1().getId()),
                        findMatchPlayer(m, m.getPlayer2().getId())))
                .toList();
    }

    public List<MatchResponse> getHistory(Long personId) {
        Person p = findPerson(personId);
        return matchRepo.findHistoryForPerson(p).stream()
                .map(m -> MatchResponse.from(m,
                        findMatchPlayer(m, m.getPlayer1().getId()),
                        findMatchPlayer(m, m.getPlayer2().getId())))
                .toList();
    }

    public List<MatchResponse> getPendingInvites(Long personId) {
        Person p = findPerson(personId);
        return matchRepo.findPendingInvitesForReceiver(p).stream()
                .map(m -> MatchResponse.from(m,
                        findMatchPlayer(m, m.getPlayer1().getId()),
                        findMatchPlayer(m, m.getPlayer2().getId())))
                .toList();
    }


    @Transactional
    public void resolveTurn(Match match, MatchRound round, MatchTurn turn,
                             List<MatchTurnMove> moves) {
        if (turn.getResult() != TurnResult.PENDING) return;

        MatchTurnMove moveP1 = moves.stream()
                .filter(m -> m.getPlayer().getId().equals(match.getPlayer1().getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Falta la jugada de player1"));
        MatchTurnMove moveP2 = moves.stream()
                .filter(m -> m.getPlayer().getId().equals(match.getPlayer2().getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Falta la jugada de player2"));

        int v1 = attrValue(moveP1.getCard(), moveP1.getAttribute());
        int v2 = attrValue(moveP2.getCard(), moveP2.getAttribute());

        TurnResult result;
        if      (v1 > v2) { result = TurnResult.PLAYER1_WINS; round.setTurnsWonPlayer1(round.getTurnsWonPlayer1() + 1); }
        else if (v2 > v1) { result = TurnResult.PLAYER2_WINS; round.setTurnsWonPlayer2(round.getTurnsWonPlayer2() + 1); }
        else              { result = TurnResult.TIE; }

        turn.setResult(result);
        turnRepo.save(turn);
        roundRepo.save(round);

        MatchPlayer mp1 = findMatchPlayer(match, match.getPlayer1().getId());
        MatchPlayer mp2 = findMatchPlayer(match, match.getPlayer2().getId());

        mp1.setTurnsWonLastRound(round.getTurnsWonPlayer1());
        mp2.setTurnsWonLastRound(round.getTurnsWonPlayer2());
        mp1.setConsecutiveLegend(moveP1.getCard().getType() == CardType.LEGEND
                ? mp1.getConsecutiveLegend() + 1 : 0);
        mp2.setConsecutiveLegend(moveP2.getCard().getType() == CardType.LEGEND
                ? mp2.getConsecutiveLegend() + 1 : 0);

        if (round.getTurnsWonPlayer1() >= TURN_WINS_PER_ROUND) {
            round.setCompleted(true);
            roundRepo.save(round);
            mp1.setRoundsWon(mp1.getRoundsWon() + 1);
            matchPlayerRepo.saveAll(List.of(mp1, mp2));
            tryFinishOrContinue(match, round, mp1, mp2);
        } else if (round.getTurnsWonPlayer2() >= TURN_WINS_PER_ROUND) {
            round.setCompleted(true);
            roundRepo.save(round);
            mp2.setRoundsWon(mp2.getRoundsWon() + 1);
            matchPlayerRepo.saveAll(List.of(mp1, mp2));
            tryFinishOrContinue(match, round, mp1, mp2);
        } else {
            matchPlayerRepo.saveAll(List.of(mp1, mp2));
            if (!anyMovesAvailable(match)) {
                applyTiebreaker(match, round, mp1, mp2);
            } else {
                createNextTurnInRound(match, round);
                matchRepo.save(match);
            }
        }
    }


    @Transactional
    public void autoMoveIfTimeout(MatchTurn turn, long timeoutSeconds) {
        MatchTurn quick = turnRepo.findById(turn.getId()).orElse(null);
        if (quick == null || quick.getResult() != TurnResult.PENDING) return;

        List<MatchTurnMove> existingMoves = turnMoveRepo.findByTurn(quick);
        Match quickMatch = quick.getRound().getMatch();
        List<MatchPlayer> allPlayers = matchPlayerRepo.findByMatch(quickMatch);
        Set<Long> submittedIds = existingMoves.stream()
                .map(m -> m.getPlayer().getId()).collect(Collectors.toSet());
        boolean allAlreadySubmitted = allPlayers.stream()
                .allMatch(mp -> submittedIds.contains(mp.getPlayer().getId()));

        if (!allAlreadySubmitted) {
            LocalDateTime deadline = quick.getCreatedAt().plusSeconds(timeoutSeconds);
            if (LocalDateTime.now().isBefore(deadline)) return;
        }

        Match match = matchRepo.findByIdForUpdate(quickMatch.getId()).orElse(null);
        if (match == null || match.getStatus() != MatchStatus.IN_PROGRESS) return;

        List<MatchTurn> pendingLocked = turnRepo.findPendingByRoundForUpdate(
                quick.getRound(), TurnResult.PENDING);
        MatchTurn fresh = pendingLocked.stream()
                .filter(t -> t.getId().equals(quick.getId()))
                .findFirst().orElse(null);
        if (fresh == null) return;

        List<MatchTurnMove> freshMoves = turnMoveRepo.findByTurn(fresh);
        Set<Long> freshSubmittedIds   = freshMoves.stream()
                .map(m -> m.getPlayer().getId()).collect(Collectors.toSet());

        allPlayers = matchPlayerRepo.findByMatch(match);
        List<MatchPlayer> playersNeedingAuto = allPlayers.stream()
                .filter(mp -> !freshSubmittedIds.contains(mp.getPlayer().getId()))
                .toList();

        if (playersNeedingAuto.isEmpty()) {
            if (fresh.getResult() == TurnResult.PENDING) {
                MatchRound round = roundRepo.findById(fresh.getRound().getId()).orElseThrow();
                resolveTurn(match, round, fresh, freshMoves);
            }
            return;
        }

        for (MatchPlayer mp : playersNeedingAuto) {
            autoMoveForPlayer(match, fresh, mp);
        }

        List<MatchTurnMove> finalMoves = turnMoveRepo.findByTurn(fresh);
        fresh = turnRepo.findById(fresh.getId()).orElse(fresh);
        boolean allNowSubmitted = allPlayers.stream()
                .allMatch(mp -> finalMoves.stream()
                        .anyMatch(m -> m.getPlayer().getId().equals(mp.getPlayer().getId())));
        if (allNowSubmitted && fresh.getResult() == TurnResult.PENDING) {
            MatchRound round = roundRepo.findById(fresh.getRound().getId()).orElseThrow();
            resolveTurn(match, round, fresh, finalMoves);
        }
    }

    @Transactional
    public void checkDisconnectForMatch(Match match, long disconnectSeconds) {
        Match fresh = matchRepo.findById(match.getId()).orElse(null);
        if (fresh == null || fresh.getStatus() != MatchStatus.IN_PROGRESS) return;

        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(disconnectSeconds);
        List<MatchPlayer> players = matchPlayerRepo.findByMatch(fresh);

        List<MatchPlayer> disconnected = players.stream()
                .filter(mp -> mp.getLastActivity() != null
                        && mp.getLastActivity().isBefore(cutoff))
                .toList();

        if (disconnected.size() >= players.size()) {
            fresh.setWonByAbandon(true);
            finishMatch(fresh, null);
        } else if (disconnected.size() == 1) {
            MatchPlayer winner = players.stream()
                    .filter(mp -> !mp.getId().equals(disconnected.get(0).getId()))
                    .findFirst().orElseThrow();
            fresh.setWonByAbandon(true);
            finishMatch(fresh, winner.getPlayer());
        }
    }


    public MatchStateResponse buildState(Match match) {
        match = matchRepo.findById(match.getId()).orElse(match);

        MatchPlayer mp1 = findMatchPlayer(match, match.getPlayer1().getId());
        MatchPlayer mp2 = findMatchPlayer(match, match.getPlayer2().getId());

        MatchRound currentRound = null;
        int roundNum = 0, turnsP1 = 0, turnsP2 = 0;

        Optional<MatchRound> activeRound = roundRepo.findFirstByMatchAndCompletedFalse(match);
        if (activeRound.isPresent()) {
            currentRound = activeRound.get();
            roundNum = currentRound.getRoundNumber();
            turnsP1  = currentRound.getTurnsWonPlayer1();
            turnsP2  = currentRound.getTurnsWonPlayer2();
        } else {
            List<MatchRound> rounds = roundRepo.findByMatchOrderByRoundNumberAsc(match);
            if (!rounds.isEmpty()) {
                currentRound = rounds.get(rounds.size() - 1);
                roundNum = currentRound.getRoundNumber();
                turnsP1  = currentRound.getTurnsWonPlayer1();
                turnsP2  = currentRound.getTurnsWonPlayer2();
            }
        }

        List<MatchTurnMove> completedMoves = turnMoveRepo.findAllCompletedByMatch(match);
        List<CardStateDto>  p1Cards = buildCardStates(mp1, completedMoves);
        List<CardStateDto>  p2Cards = buildCardStates(mp2, completedMoves);

        TurnStateDto pendingTurn  = null;
        TurnStateDto lastCompleted = null;

        List<MatchTurn> allTurns = turnRepo.findAllByMatchOrdered(match);
        Long player1Id = match.getPlayer1().getId();
        Long player2Id = match.getPlayer2().getId();
        
        for (int i = allTurns.size() - 1; i >= 0; i--) {
            MatchTurn t = allTurns.get(i);
            List<MatchTurnMove> turnMoves = turnMoveRepo.findByTurn(t);
            MatchTurnMove moveP1 = turnMoves.stream()
                    .filter(m -> m.getPlayer().getId().equals(player1Id))
                    .findFirst().orElse(null);
            MatchTurnMove moveP2 = turnMoves.stream()
                    .filter(m -> m.getPlayer().getId().equals(player2Id))
                    .findFirst().orElse(null);

            if (t.getResult() == TurnResult.PENDING && pendingTurn == null) {
                pendingTurn = TurnStateDto.from(t, moveP1, moveP2);
            } else if (t.getResult() != TurnResult.PENDING && lastCompleted == null) {
                lastCompleted = TurnStateDto.from(t, moveP1, moveP2);
            }
            if (pendingTurn != null && lastCompleted != null) break;
        }

        int rwXpP1 = 0, rwPtsP1 = 0, rwXpP2 = 0, rwPtsP2 = 0;
        if (match.getStatus() == MatchStatus.FINISHED) {
            Person winner = match.getWinner();
            if (winner == null) {
                rwXpP1 = XP_DRAW; rwPtsP1 = PTS_DRAW;
                rwXpP2 = XP_DRAW; rwPtsP2 = PTS_DRAW;
            } else {
                boolean p1Won = winner.getId().equals(match.getPlayer1().getId());
                rwXpP1  = p1Won ? XP_WIN  : XP_LOSS;
                rwPtsP1 = p1Won ? PTS_WIN  : PTS_LOSS;
                rwXpP2  = p1Won ? XP_LOSS  : XP_WIN;
                rwPtsP2 = p1Won ? PTS_LOSS : PTS_WIN;
            }
        }

        LocalDateTime cutoff    = LocalDateTime.now().minusSeconds(35);
        boolean p1Connected     = mp1.getLastActivity() != null && mp1.getLastActivity().isAfter(cutoff);
        boolean p2Connected     = mp2.getLastActivity() != null && mp2.getLastActivity().isAfter(cutoff);

        return new MatchStateResponse(
                match.getId(),
                match.getStatus(),
                PersonResponse.from(match.getPlayer1()),
                PersonResponse.from(match.getPlayer2()),
                mp1.getDeck() != null ? mp1.getDeck().getId() : null,
                mp2.getDeck() != null ? mp2.getDeck().getId() : null,
                mp1.isReady(),
                mp2.isReady(),
                mp1.getRoundsWon(),
                mp2.getRoundsWon(),
                roundNum, turnsP1, turnsP2,
                p1Cards, p2Cards,
                pendingTurn,
                lastCompleted,
                match.getWinner() != null ? match.getWinner().getId() : null,
                match.getStatus() == MatchStatus.FINISHED && match.getWinner() == null,
                match.isWonByAbandon(),
                rwXpP1, rwPtsP1, rwXpP2, rwPtsP2,
                match.getCreatedAt(),
                mp1.isWantsRematch(),
                mp2.isWantsRematch(),
                match.getRematchMatchId(),
                p1Connected,
                p2Connected
        );
    }


    @Transactional
    public void finishMatch(Match match, Person winner) {
        match.setWinner(winner);
        match.setStatus(MatchStatus.FINISHED);
        matchRepo.save(match);

        Person p1 = match.getPlayer1();
        Person p2 = match.getPlayer2();

        if (winner == null) {
            grantRewards(p1, XP_DRAW, PTS_DRAW);
            grantRewards(p2, XP_DRAW, PTS_DRAW);
        } else {
            Person loser = winner.getId().equals(p1.getId()) ? p2 : p1;
            grantRewards(winner, XP_WIN, PTS_WIN);
            grantRewards(loser,  XP_LOSS, PTS_LOSS);
            missionService.recordEvent(winner, MissionType.WIN_MATCHES);
        }
        missionService.recordEvent(p1, MissionType.PLAY_MATCHES);
        missionService.recordEvent(p2, MissionType.PLAY_MATCHES);
    }

    private void tryFinishOrContinue(Match match, MatchRound completedRound,
                                      MatchPlayer mp1, MatchPlayer mp2) {
        if (mp1.getRoundsWon() >= ROUNDS_TO_WIN) {
            finishMatch(match, match.getPlayer1());
        } else if (mp2.getRoundsWon() >= ROUNDS_TO_WIN) {
            finishMatch(match, match.getPlayer2());
        } else if (!anyMovesAvailable(match)) {
            applyTiebreaker(match, completedRound, mp1, mp2);
        } else {
            int nextRoundNum = roundRepo.countByMatch(match) + 1;
            createNextRoundAndTurn(match, nextRoundNum);
            matchRepo.save(match);
        }
    }

    private void applyTiebreaker(Match match, MatchRound lastRound,
                                  MatchPlayer mp1, MatchPlayer mp2) {
        if      (mp1.getRoundsWon() > mp2.getRoundsWon()) { finishMatch(match, match.getPlayer1()); return; }
        else if (mp2.getRoundsWon() > mp1.getRoundsWon()) { finishMatch(match, match.getPlayer2()); return; }

        int t1 = lastRound.getTurnsWonPlayer1();
        int t2 = lastRound.getTurnsWonPlayer2();
        if      (t1 > t2) { finishMatch(match, match.getPlayer1()); return; }
        else if (t2 > t1) { finishMatch(match, match.getPlayer2()); return; }

        finishMatch(match, null);
    }

    private void autoMoveForPlayer(Match match, MatchTurn turn, MatchPlayer mp) {
        List<Card> deckCards = deckCardRepo.findByDeck(mp.getDeck()).stream()
                .map(DeckCard::getCard).collect(Collectors.toList());
        List<MatchTurnMove> completed = turnMoveRepo.findAllCompletedByMatch(match);
        List<CardAttribute> allAttrs  = Arrays.asList(CardAttribute.values());

        Collections.shuffle(deckCards);
        for (Card card : deckCards) {
            Set<CardAttribute> used = usedAttributesForCard(completed, mp.getPlayer().getId(), card);
            List<CardAttribute> available = allAttrs.stream()
                    .filter(a -> !used.contains(a)).collect(Collectors.toList());
            if (available.isEmpty()) continue;

            if (card.getType() == CardType.LEGEND && mp.getConsecutiveLegend() >= 2) {
                boolean hasAlt = deckCards.stream()
                        .filter(c2 -> c2.getType() != CardType.LEGEND)
                        .anyMatch(c2 -> usedAttributesForCard(
                                completed, mp.getPlayer().getId(), c2).size() < 3);
                if (hasAlt) continue;
            }

            Collections.shuffle(available);
            MatchTurnMove move = new MatchTurnMove();
            move.setTurn(turn);
            move.setPlayer(mp.getPlayer());
            move.setCard(card);
            move.setAttribute(available.get(0));
            move.setSubmittedAt(LocalDateTime.now());
            turnMoveRepo.save(move);
            return;
        }
        log.warn("autoMove: sin movimientos disponibles para playerId={} en partida {}",
                mp.getPlayer().getId(), match.getId());
    }

    private List<CardStateDto> buildCardStates(MatchPlayer mp,
                                                List<MatchTurnMove> completedMoves) {
        if (mp.getDeck() == null) return List.of();

        int consecutiveLegend = mp.getConsecutiveLegend();
        Long playerId         = mp.getPlayer().getId();
        List<DeckCard> deckCards = deckCardRepo.findByDeck(mp.getDeck());

        boolean hasNonLegendAvailable = consecutiveLegend >= 2 && deckCards.stream()
                .filter(dc -> dc.getCard().getType() != CardType.LEGEND)
                .anyMatch(dc -> usedAttributesForCard(completedMoves, playerId, dc.getCard()).size() < 3);

        return deckCards.stream().map(dc -> {
            Card card = dc.getCard();
            Set<CardAttribute> used = usedAttributesForCard(completedMoves, playerId, card);
            boolean legendBlocked = card.getType() == CardType.LEGEND
                    && consecutiveLegend >= 2 && hasNonLegendAvailable;
            return CardStateDto.from(card, used, legendBlocked);
        }).toList();
    }

    private void createNextRoundAndTurn(Match match, int roundNumber) {
        MatchRound round = new MatchRound();
        round.setMatch(match);
        round.setRoundNumber(roundNumber);
        roundRepo.save(round);
        createNextTurnInRound(match, round);
    }

    private void createNextTurnInRound(Match match, MatchRound round) {
        int nextTurnNum = turnRepo.findByRoundOrderByTurnNumberAsc(round).size() + 1;
        MatchTurn turn  = new MatchTurn();
        turn.setRound(round);
        turn.setTurnNumber(nextTurnNum);
        turn.setCreatedAt(LocalDateTime.now());
        turnRepo.save(turn);
    }

    private MatchRound currentRound(Match match) {
        return roundRepo.findFirstByMatchAndCompletedFalse(match)
                .orElseThrow(() -> new IllegalStateException("No hay ronda activa"));
    }

    private Set<CardAttribute> usedAttributesForCard(List<MatchTurnMove> completedMoves,
                                                      Long playerId, Card card) {
        return completedMoves.stream()
                .filter(m -> m.getPlayer().getId().equals(playerId)
                        && m.getCard() != null
                        && m.getCard().getId().equals(card.getId()))
                .map(MatchTurnMove::getAttribute)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private boolean anyMovesAvailable(Match match) {
        List<MatchTurnMove> completed = turnMoveRepo.findAllCompletedByMatch(match);
        return matchPlayerRepo.findByMatch(match).stream()
                .anyMatch(mp -> hasMovesForPlayer(mp, completed));
    }

    private boolean hasMovesForPlayer(MatchPlayer mp, List<MatchTurnMove> completed) {
        if (mp.getDeck() == null) return false;
        Long playerId = mp.getPlayer().getId();
        for (DeckCard dc : deckCardRepo.findByDeck(mp.getDeck())) {
            if (usedAttributesForCard(completed, playerId, dc.getCard()).size() < 3) return true;
        }
        return false;
    }

    private Card findCardInDeck(Deck deck, Long cardId) {
        return deckCardRepo.findByDeck(deck).stream()
                .map(DeckCard::getCard)
                .filter(c -> c.getId().equals(cardId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("La carta no está en tu baraja"));
    }

    private int attrValue(Card card, CardAttribute attr) {
        return switch (attr) {
            case ATTACK  -> card.getAttack();
            case CONTROL -> card.getControl();
            case DEFENSE -> card.getDefense();
        };
    }

    private void grantRewards(Person person, int xp, int points) {
        person.setPackPoints(person.getPackPoints() + points);
        person.setTotalExperience(person.getTotalExperience() + xp);
        int remaining = xp;
        while (remaining > 0) {
            int xpForNext = XP_PER_LEVEL + (person.getLevel() - 1) * XP_INCREMENT;
            int gap = xpForNext - person.getExperience();
            if (remaining >= gap) {
                remaining -= gap;
                person.setLevel(person.getLevel() + 1);
                person.setExperience(0);
                person.setPackPoints(person.getPackPoints() + POINTS_ON_LEVEL);
            } else {
                person.setExperience(person.getExperience() + remaining);
                remaining = 0;
            }
        }
        personRepo.save(person);
    }

    private MatchPlayer findMatchPlayer(Match match, Long playerId) {
        return matchPlayerRepo.findByMatchAndPlayerId(match, playerId)
                .orElseThrow(() -> new IllegalArgumentException("No eres participante de esta partida"));
    }

    private Match  findMatch(Long id) {
        return matchRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Partida no encontrada"));
    }

    private Match  findMatchForUpdate(Long id) {
        return matchRepo.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException("Partida no encontrada"));
    }

    private Person findPerson(Long id) {
        return personRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Persona no encontrada"));
    }
}
