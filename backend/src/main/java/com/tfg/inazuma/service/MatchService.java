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
    
    private final MatchRepository     matchRepo;
    private final MatchRoundRepository roundRepo;
    private final MatchTurnRepository  turnRepo;
    private final PersonRepository    personRepo;
    private final DeckRepository      deckRepo;
    private final DeckCardRepository  deckCardRepo;
    private final MissionService      missionService;

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

        return MatchResponse.from(match);
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
            match.setLastActivityPlayer1(LocalDateTime.now());
            match.setLastActivityPlayer2(LocalDateTime.now());
        } else {
            match.setStatus(MatchStatus.REJECTED);
        }

        return MatchResponse.from(matchRepo.save(match));
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
        return MatchResponse.from(matchRepo.save(match));
    }

@Transactional
    public MatchStateResponse setReady(Long matchId, Long playerId, Long deckId) {
        Match match = findMatch(matchId);

        if (match.getStatus() != MatchStatus.WAITING_READY)
            throw new IllegalStateException("La partida no está en fase de lobby");

        Deck deck = deckRepo.findById(deckId)
                .orElseThrow(() -> new IllegalArgumentException("Baraja no encontrada"));
        if (!deck.getPerson().getId().equals(playerId))
            throw new IllegalArgumentException("Esta baraja no te pertenece");
        if (deckCardRepo.countByDeck(deck) != 5)
            throw new IllegalArgumentException("La baraja debe tener exactamente 5 cartas");

        boolean isPlayer1 = match.getPlayer1().getId().equals(playerId);
        boolean isPlayer2 = match.getPlayer2().getId().equals(playerId);

        if (!isPlayer1 && !isPlayer2)
            throw new IllegalArgumentException("No eres participante de esta partida");

        if (isPlayer1) { match.setDeck1(deck); match.setPlayer1Ready(true); }
        else           { match.setDeck2(deck); match.setPlayer2Ready(true); }

        if (match.isPlayer1Ready() && match.isPlayer2Ready()) {
            match.setStatus(MatchStatus.IN_PROGRESS);
            match.setLastActivityPlayer1(LocalDateTime.now());
            match.setLastActivityPlayer2(LocalDateTime.now());
            matchRepo.save(match);
            createNextRoundAndTurn(match, 1);
        } else {
            matchRepo.save(match);
        }

        return buildState(match);
    }

@Transactional
    public MatchStateResponse unsetReady(Long matchId, Long playerId) {
        Match match = findMatch(matchId);

        if (match.getStatus() != MatchStatus.WAITING_READY)
            throw new IllegalStateException("La partida no está en fase de lobby");

        boolean isP1 = match.getPlayer1().getId().equals(playerId);
        boolean isP2 = match.getPlayer2().getId().equals(playerId);
        if (!isP1 && !isP2)
            throw new IllegalArgumentException("No eres participante de esta partida");

        if (isP1) { match.setPlayer1Ready(false); match.setDeck1(null); }
        else      { match.setPlayer2Ready(false); match.setDeck2(null); }

        return buildState(matchRepo.save(match));
    }

@Transactional
    public MatchStateResponse submitMove(Long matchId, Long playerId,
                                         Long cardId, CardAttribute attribute) {
        Match match = findMatch(matchId);

        if (match.getStatus() != MatchStatus.IN_PROGRESS)
            throw new IllegalStateException("La partida no está en curso");

        boolean isP1 = match.getPlayer1().getId().equals(playerId);
        boolean isP2 = match.getPlayer2().getId().equals(playerId);
        if (!isP1 && !isP2)
            throw new IllegalArgumentException("No eres participante de esta partida");

        MatchRound round = currentRound(match);
        MatchTurn turn = turnRepo.findFirstByRoundAndResult(round, TurnResult.PENDING)
                .orElseThrow(() -> new IllegalStateException("No hay turno pendiente"));

        if (isP1 && turn.getPlayer1SubmittedAt() != null)
            throw new IllegalStateException("Ya has enviado tu jugada para este turno");
        if (isP2 && turn.getPlayer2SubmittedAt() != null)
            throw new IllegalStateException("Ya has enviado tu jugada para este turno");

        Deck myDeck = isP1 ? match.getDeck1() : match.getDeck2();
        Card card = findCardInDeck(myDeck, cardId);

        Set<CardAttribute> usedForCard = getUsedAttributesForCard(match, isP1, card);
        if (usedForCard.contains(attribute))
            throw new IllegalArgumentException("Ya usaste ese atributo de esa carta");

        int consecutiveLegend = isP1
                ? match.getConsecutiveLegendPlayer1()
                : match.getConsecutiveLegendPlayer2();
        if (card.getType() == CardType.LEGEND && consecutiveLegend >= 2) {
            boolean hasNonLegendAvailable = deckCardRepo.findByDeck(myDeck).stream()
                    .filter(dc -> dc.getCard().getType() != CardType.LEGEND)
                    .anyMatch(dc -> getUsedAttributesForCard(match, isP1, dc.getCard()).size() < 3);
            if (hasNonLegendAvailable)
                throw new IllegalArgumentException(
                        "No puedes usar una carta Legend tres turnos consecutivos");
        }

        if (isP1) {
            turn.setPlayer1Card(card);
            turn.setPlayer1Attribute(attribute);
            turn.setPlayer1SubmittedAt(LocalDateTime.now());
        } else {
            turn.setPlayer2Card(card);
            turn.setPlayer2Attribute(attribute);
            turn.setPlayer2SubmittedAt(LocalDateTime.now());
        }

        updateActivity(match, isP1);

        boolean bothSubmitted = turn.getPlayer1SubmittedAt() != null
                && turn.getPlayer2SubmittedAt() != null;

        if (!bothSubmitted) {
            LocalDateTime deadline = turn.getCreatedAt().plusSeconds(TURN_TIMEOUT_SECONDS);
            if (LocalDateTime.now().isAfter(deadline)) {
                autoMoveForPlayer(match, turn, !isP1);
                bothSubmitted = true;
            }
        }

        if (bothSubmitted) {
            turnRepo.save(turn);
            resolveTurn(match, round, turn);
        } else {
            turnRepo.save(turn);
            matchRepo.save(match);
        }

        return buildState(match);
    }

@Transactional
    public void heartbeat(Long matchId, Long playerId) {
        Match match = findMatch(matchId);
        if (match.getStatus() != MatchStatus.IN_PROGRESS) return;
        boolean isP1 = match.getPlayer1().getId().equals(playerId);
        updateActivity(match, isP1);
        matchRepo.save(match);
    }

@Transactional
    public MatchStateResponse forfeit(Long matchId, Long playerId) {
        Match match = findMatch(matchId);
        if (match.getStatus() != MatchStatus.IN_PROGRESS)
            throw new IllegalStateException("La partida no está en curso");

        boolean isP1 = match.getPlayer1().getId().equals(playerId);
        if (!isP1 && !match.getPlayer2().getId().equals(playerId))
            throw new IllegalArgumentException("No eres participante de esta partida");

        Person winner = isP1 ? match.getPlayer2() : match.getPlayer1();
        match.setWonByAbandon(true);   
        finishMatch(match, winner);
        return buildState(match);
    }

@Transactional
    public MatchStateResponse voteRematch(Long matchId, Long playerId, boolean wants) {
        Match match = findMatch(matchId);

        if (match.getStatus() != MatchStatus.FINISHED)
            throw new IllegalStateException("La partida no ha terminado");

        boolean isP1 = match.getPlayer1().getId().equals(playerId);
        boolean isP2 = match.getPlayer2().getId().equals(playerId);
        if (!isP1 && !isP2)
            throw new IllegalArgumentException("No eres participante de esta partida");

        if (isP1) match.setPlayer1WantsRematch(wants);
        else      match.setPlayer2WantsRematch(wants);

        if (!wants) {
            match.setPlayer1WantsRematch(false);
            match.setPlayer2WantsRematch(false);
            match.setRematchMatchId(null);
        }

        if (match.isPlayer1WantsRematch() && match.isPlayer2WantsRematch()
                && match.getRematchMatchId() == null) {
            Match rematch = new Match();
            rematch.setPlayer1(match.getPlayer1());
            rematch.setPlayer2(match.getPlayer2());
            rematch.setStatus(MatchStatus.WAITING_READY);
            rematch.setCreatedAt(LocalDateTime.now());
            rematch.setLastActivityPlayer1(LocalDateTime.now());
            rematch.setLastActivityPlayer2(LocalDateTime.now());
            matchRepo.save(rematch);
            match.setRematchMatchId(rematch.getId());
        }

        matchRepo.save(match);
        return buildState(match);
    }

public MatchStateResponse getState(Long matchId) {
        return buildState(findMatch(matchId));
    }

    public List<MatchResponse> getActive(Long personId) {
        Person p = findPerson(personId);
        return matchRepo.findActiveForPerson(p)
                .stream().map(MatchResponse::from).toList();
    }

    public List<MatchResponse> getHistory(Long personId) {
        Person p = findPerson(personId);
        return matchRepo.findHistoryForPerson(p)
                .stream().map(MatchResponse::from).toList();
    }

    public List<MatchResponse> getPendingInvites(Long personId) {
        Person p = findPerson(personId);
        return matchRepo.findPendingInvitesForReceiver(p)
                .stream().map(MatchResponse::from).toList();
    }

@Transactional
    public void resolveTurn(Match match, MatchRound round, MatchTurn turn) {
        int v1 = attrValue(turn.getPlayer1Card(), turn.getPlayer1Attribute());
        int v2 = attrValue(turn.getPlayer2Card(), turn.getPlayer2Attribute());

        TurnResult result;
        if (v1 > v2)      { result = TurnResult.PLAYER1_WINS; round.setTurnsWonPlayer1(round.getTurnsWonPlayer1() + 1); }
        else if (v2 > v1) { result = TurnResult.PLAYER2_WINS; round.setTurnsWonPlayer2(round.getTurnsWonPlayer2() + 1); }
        else              { result = TurnResult.TIE; }

        turn.setResult(result);
        turnRepo.save(turn);

        match.setTurnsWonPlayer1LastRound(round.getTurnsWonPlayer1());
        match.setTurnsWonPlayer2LastRound(round.getTurnsWonPlayer2());

        boolean p1UsedLegend = turn.getPlayer1Card().getType() == CardType.LEGEND;
        boolean p2UsedLegend = turn.getPlayer2Card().getType() == CardType.LEGEND;
        match.setConsecutiveLegendPlayer1(p1UsedLegend ? match.getConsecutiveLegendPlayer1() + 1 : 0);
        match.setConsecutiveLegendPlayer2(p2UsedLegend ? match.getConsecutiveLegendPlayer2() + 1 : 0);

        if (round.getTurnsWonPlayer1() >= TURN_WINS_PER_ROUND) {
            round.setCompleted(true);
            roundRepo.save(round);
            match.setRoundsWonPlayer1(match.getRoundsWonPlayer1() + 1);
            tryFinishOrContinue(match, round);
        } else if (round.getTurnsWonPlayer2() >= TURN_WINS_PER_ROUND) {
            round.setCompleted(true);
            roundRepo.save(round);
            match.setRoundsWonPlayer2(match.getRoundsWonPlayer2() + 1);
            tryFinishOrContinue(match, round);
        } else {
            roundRepo.save(round);
            if (!anyMovesAvailable(match)) {
                applyTiebreaker(match, round);
            } else {
                createNextTurnInRound(match, round);
            }
        }
    }

private void tryFinishOrContinue(Match match, MatchRound completedRound) {
        if (match.getRoundsWonPlayer1() >= ROUNDS_TO_WIN) {
            finishMatch(match, match.getPlayer1());
        } else if (match.getRoundsWonPlayer2() >= ROUNDS_TO_WIN) {
            finishMatch(match, match.getPlayer2());
        } else if (!anyMovesAvailable(match)) {
            applyTiebreaker(match, completedRound);
        } else {
            int nextRoundNum = roundRepo.countByMatch(match) + 1;
            createNextRoundAndTurn(match, nextRoundNum);
        }
    }

private void applyTiebreaker(Match match, MatchRound lastRound) {
        int r1 = match.getRoundsWonPlayer1();
        int r2 = match.getRoundsWonPlayer2();

        if (r1 > r2) { finishMatch(match, match.getPlayer1()); return; }
        if (r2 > r1) { finishMatch(match, match.getPlayer2()); return; }

        int t1 = lastRound.getTurnsWonPlayer1();
        int t2 = lastRound.getTurnsWonPlayer2();
        if (t1 > t2) { finishMatch(match, match.getPlayer1()); return; }
        if (t2 > t1) { finishMatch(match, match.getPlayer2()); return; }

        finishMatch(match, null);
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

@Transactional
    public void autoMoveIfTimeout(MatchTurn turn, long timeoutSeconds) {
        MatchTurn fresh = turnRepo.findById(turn.getId()).orElse(null);
        if (fresh == null || fresh.getResult() != TurnResult.PENDING) return;

        LocalDateTime deadline = fresh.getCreatedAt().plusSeconds(timeoutSeconds);
        if (LocalDateTime.now().isBefore(deadline)) return;

        Match match = fresh.getRound().getMatch();
        if (match.getStatus() != MatchStatus.IN_PROGRESS) return;

        boolean p1NeedsAuto = fresh.getPlayer1SubmittedAt() == null;
        boolean p2NeedsAuto = fresh.getPlayer2SubmittedAt() == null;

        if (p1NeedsAuto) autoMoveForPlayer(match, fresh, true);
        if (p2NeedsAuto) autoMoveForPlayer(match, fresh, false);

        fresh = turnRepo.findById(fresh.getId()).orElse(fresh);
        if (fresh.getPlayer1SubmittedAt() != null && fresh.getPlayer2SubmittedAt() != null
                && fresh.getResult() == TurnResult.PENDING) {
            MatchRound round = roundRepo.findById(fresh.getRound().getId()).orElse(fresh.getRound());
            Match freshMatch = matchRepo.findById(match.getId()).orElse(match);
            resolveTurn(freshMatch, round, fresh);
        }
    }

    private void autoMoveForPlayer(Match match, MatchTurn turn, boolean isP1) {
        Deck deck = isP1 ? match.getDeck1() : match.getDeck2();
        List<Card> deckCards = deckCardRepo.findByDeck(deck).stream()
                .map(DeckCard::getCard).collect(Collectors.toList());

        List<CardAttribute> allAttrs = Arrays.asList(CardAttribute.values());
        Collections.shuffle(deckCards);

        for (Card card : deckCards) {
            Set<CardAttribute> used = getUsedAttributesForCard(match, isP1, card);
            List<CardAttribute> available = allAttrs.stream()
                    .filter(a -> !used.contains(a))
                    .collect(Collectors.toList());
            if (available.isEmpty()) continue;

            int consecutive = isP1
                    ? match.getConsecutiveLegendPlayer1()
                    : match.getConsecutiveLegendPlayer2();
            if (card.getType() == CardType.LEGEND && consecutive >= 2) {
                boolean hasAlt = deckCards.stream()
                        .filter(c2 -> c2.getType() != CardType.LEGEND)
                        .anyMatch(c2 -> getUsedAttributesForCard(match, isP1, c2).size() < 3);
                if (hasAlt) continue;  
            }

            Collections.shuffle(available);
            CardAttribute attr = available.get(0);

            if (isP1) {
                turn.setPlayer1Card(card);
                turn.setPlayer1Attribute(attr);
                turn.setPlayer1SubmittedAt(LocalDateTime.now());
            } else {
                turn.setPlayer2Card(card);
                turn.setPlayer2Attribute(attr);
                turn.setPlayer2SubmittedAt(LocalDateTime.now());
            }
            turnRepo.save(turn);
            return;
        }
        log.warn("autoMove: no hay movimientos disponibles para el jugador {} en partida {}",
                isP1 ? "1" : "2", match.getId());
    }

@Transactional
    public void checkDisconnectForMatch(Match match, long disconnectSeconds) {
        Match fresh = matchRepo.findById(match.getId()).orElse(null);
        if (fresh == null || fresh.getStatus() != MatchStatus.IN_PROGRESS) return;

        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(disconnectSeconds);
        boolean p1Disconnected = fresh.getLastActivityPlayer1() != null
                && fresh.getLastActivityPlayer1().isBefore(cutoff);
        boolean p2Disconnected = fresh.getLastActivityPlayer2() != null
                && fresh.getLastActivityPlayer2().isBefore(cutoff);

        if (p1Disconnected && p2Disconnected) {
            fresh.setWonByAbandon(true);
            finishMatch(fresh, null);
        } else if (p1Disconnected) {
            fresh.setWonByAbandon(true);
            finishMatch(fresh, fresh.getPlayer2());
        } else if (p2Disconnected) {
            fresh.setWonByAbandon(true);
            finishMatch(fresh, fresh.getPlayer1());
        }
    }

public MatchStateResponse buildState(Match match) {
        match = matchRepo.findById(match.getId()).orElse(match);

        MatchRound currentRound = null;
        int roundNum = 0, turnsP1 = 0, turnsP2 = 0;

        Optional<MatchRound> activeRound = roundRepo.findFirstByMatchAndCompletedFalse(match);
        if (activeRound.isPresent()) {
            currentRound = activeRound.get();
            roundNum  = currentRound.getRoundNumber();
            turnsP1   = currentRound.getTurnsWonPlayer1();
            turnsP2   = currentRound.getTurnsWonPlayer2();
        } else {
            List<MatchRound> rounds = roundRepo.findByMatchOrderByRoundNumberAsc(match);
            if (!rounds.isEmpty()) {
                currentRound = rounds.get(rounds.size() - 1);
                roundNum = currentRound.getRoundNumber();
                turnsP1  = currentRound.getTurnsWonPlayer1();
                turnsP2  = currentRound.getTurnsWonPlayer2();
            }
        }

        List<CardStateDto> p1Cards = buildCardStates(match, true);
        List<CardStateDto> p2Cards = buildCardStates(match, false);

        TurnStateDto pendingTurn = null;
        TurnStateDto lastCompleted = null;

        List<MatchTurn> allTurns = turnRepo.findAllByMatchOrdered(match);
        for (int i = allTurns.size() - 1; i >= 0; i--) {
            MatchTurn t = allTurns.get(i);
            if (t.getResult() == TurnResult.PENDING && pendingTurn == null) {
                pendingTurn = TurnStateDto.from(t);
            } else if (t.getResult() != TurnResult.PENDING && lastCompleted == null) {
                lastCompleted = TurnStateDto.from(t);
            }
            if (pendingTurn != null && lastCompleted != null) break;
        }

        int rwXpP1 = 0, rwPtsP1 = 0, rwXpP2 = 0, rwPtsP2 = 0;
        if (match.getStatus() == MatchStatus.FINISHED) {
            Person winner = match.getWinner();
            if (winner == null) {
                rwXpP1 = XP_DRAW;  rwPtsP1 = PTS_DRAW;
                rwXpP2 = XP_DRAW;  rwPtsP2 = PTS_DRAW;
            } else {
                boolean p1Won = winner.getId().equals(match.getPlayer1().getId());
                rwXpP1  = p1Won ? XP_WIN  : XP_LOSS;
                rwPtsP1 = p1Won ? PTS_WIN  : PTS_LOSS;
                rwXpP2  = p1Won ? XP_LOSS  : XP_WIN;
                rwPtsP2 = p1Won ? PTS_LOSS : PTS_WIN;
            }
        }

        LocalDateTime cutoff = LocalDateTime.now().minusSeconds(35);
        boolean p1Connected = match.getLastActivityPlayer1() != null
                && match.getLastActivityPlayer1().isAfter(cutoff);
        boolean p2Connected = match.getLastActivityPlayer2() != null
                && match.getLastActivityPlayer2().isAfter(cutoff);

        return new MatchStateResponse(
                match.getId(),
                match.getStatus(),
                PersonResponse.from(match.getPlayer1()),
                PersonResponse.from(match.getPlayer2()),
                match.getDeck1() != null ? match.getDeck1().getId() : null,
                match.getDeck2() != null ? match.getDeck2().getId() : null,
                match.isPlayer1Ready(),
                match.isPlayer2Ready(),
                match.getRoundsWonPlayer1(),
                match.getRoundsWonPlayer2(),
                roundNum, turnsP1, turnsP2,
                p1Cards, p2Cards,
                pendingTurn,
                lastCompleted,
                match.getWinner() != null ? match.getWinner().getId() : null,
                match.getStatus() == MatchStatus.FINISHED && match.getWinner() == null,
                match.isWonByAbandon(),
                rwXpP1, rwPtsP1, rwXpP2, rwPtsP2,
                match.getCreatedAt(),
                match.isPlayer1WantsRematch(),
                match.isPlayer2WantsRematch(),
                match.getRematchMatchId(),
                p1Connected,
                p2Connected
        );
    }

    private List<CardStateDto> buildCardStates(Match match, boolean isP1) {
        Deck deck = isP1 ? match.getDeck1() : match.getDeck2();
        if (deck == null) return List.of();

        int consecutiveLegend = isP1
                ? match.getConsecutiveLegendPlayer1()
                : match.getConsecutiveLegendPlayer2();

        List<MatchTurn> completed = turnRepo.findAllCompletedByMatch(match);
        List<DeckCard> deckCards  = deckCardRepo.findByDeck(deck);

        boolean hasNonLegendAvailable = consecutiveLegend >= 2 && deckCards.stream()
                .filter(dc -> dc.getCard().getType() != CardType.LEGEND)
                .anyMatch(dc -> getUsedAttributesForCard(match, isP1, dc.getCard()).size() < 3);

        return deckCards.stream()
                .map(dc -> {
                    Card card = dc.getCard();
                    Set<CardAttribute> used = completed.stream()
                            .filter(t -> {
                                Card c = isP1 ? t.getPlayer1Card() : t.getPlayer2Card();
                                return c != null && c.getId().equals(card.getId());
                            })
                            .map(t -> isP1 ? t.getPlayer1Attribute() : t.getPlayer2Attribute())
                            .filter(Objects::nonNull)
                            .collect(Collectors.toSet());
                    boolean legendBlocked = card.getType() == CardType.LEGEND
                            && consecutiveLegend >= 2
                            && hasNonLegendAvailable;
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
        MatchTurn turn = new MatchTurn();
        turn.setRound(round);
        turn.setTurnNumber(nextTurnNum);
        turn.setCreatedAt(LocalDateTime.now());
        turnRepo.save(turn);
    }

    private MatchRound currentRound(Match match) {
        return roundRepo.findFirstByMatchAndCompletedFalse(match)
                .orElseThrow(() -> new IllegalStateException("No hay ronda activa"));
    }

    private Set<CardAttribute> getUsedAttributesForCard(Match match, boolean isP1, Card card) {
        return turnRepo.findAllCompletedByMatch(match).stream()
                .filter(t -> {
                    Card c = isP1 ? t.getPlayer1Card() : t.getPlayer2Card();
                    return c != null && c.getId().equals(card.getId());
                })
                .map(t -> isP1 ? t.getPlayer1Attribute() : t.getPlayer2Attribute())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private boolean anyMovesAvailable(Match match) {
        return hasMovesForPlayer(match, true) || hasMovesForPlayer(match, false);
    }

    private boolean hasMovesForPlayer(Match match, boolean isP1) {
        Deck deck = isP1 ? match.getDeck1() : match.getDeck2();
        if (deck == null) return false;
        for (DeckCard dc : deckCardRepo.findByDeck(deck)) {
            Set<CardAttribute> used = getUsedAttributesForCard(match, isP1, dc.getCard());
            if (used.size() < 3) return true;
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

    private void updateActivity(Match match, boolean isP1) {
        if (isP1) match.setLastActivityPlayer1(LocalDateTime.now());
        else      match.setLastActivityPlayer2(LocalDateTime.now());
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

    private Match  findMatch (Long id) { return matchRepo .findById(id).orElseThrow(() -> new IllegalArgumentException("Partida no encontrada")); }
    private Person findPerson(Long id) { return personRepo.findById(id).orElseThrow(() -> new IllegalArgumentException("Persona no encontrada")); }
}
