package com.tfg.inazuma.service;

import com.tfg.inazuma.model.*;
import com.tfg.inazuma.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MatchService {

    private static final int XP_WIN    = 200;
    private static final int XP_DRAW   = 100;
    private static final int XP_LOSS   = 50;
    private static final int PTS_WIN   = 6;
    private static final int PTS_DRAW  = 4;
    private static final int PTS_LOSS  = 2;

    private static final int POINTS_ON_LEVEL = 12;
    private static final int XP_PER_LEVEL    = 200;
    private static final int XP_INCREMENT    = 100;

    private final MatchRepository    matchRepository;
    private final PersonRepository   personRepository;
    private final DeckRepository     deckRepository;
    private final MissionService     missionService;

    public Match createMatch(Long player1Id, Long player2Id) {
        Person player1 = findPersonOrThrow(player1Id);
        Person player2 = findPersonOrThrow(player2Id);

        if (player1.getId().equals(player2.getId()))
            throw new IllegalArgumentException("Un jugador no puede jugar contra sí mismo");

        Match match = new Match();
        match.setPlayer1(player1);
        match.setPlayer2(player2);
        return matchRepository.save(match);
    }

    @Transactional
    public Match chooseDeck(Long matchId, Long personId, Long deckId) {
        Match match = findMatchOrThrow(matchId);
        if (match.getStatus() != MatchStatus.WAITING_DECKS)
            throw new IllegalArgumentException("La partida no está en fase de selección de barajas");

        Deck deck = deckRepository.findById(deckId)
                .orElseThrow(() -> new IllegalArgumentException("Baraja no encontrada"));
        if (!deck.getPerson().getId().equals(personId))
            throw new IllegalArgumentException("Esta baraja no te pertenece");

        if (match.getPlayer1().getId().equals(personId)) {
            match.setDeck1(deck);
        } else if (match.getPlayer2().getId().equals(personId)) {
            match.setDeck2(deck);
        } else {
            throw new IllegalArgumentException("No eres participante de esta partida");
        }

        if (match.getDeck1() != null && match.getDeck2() != null)
            match.setStatus(MatchStatus.IN_PROGRESS);

        return matchRepository.save(match);
    }

    @Transactional
    public Match finishMatch(Long matchId, Long winnerId) {
        Match match = findMatchOrThrow(matchId);
        if (match.getStatus() != MatchStatus.IN_PROGRESS)
            throw new IllegalArgumentException("La partida no está en curso");

        Person player1 = match.getPlayer1();
        Person player2 = match.getPlayer2();

        if (winnerId == null) {
            grantRewards(player1, XP_DRAW, PTS_DRAW);
            grantRewards(player2, XP_DRAW, PTS_DRAW);
        } else {
            Person winner = findPersonOrThrow(winnerId);
            Person loser = winner.getId().equals(player1.getId()) ? player2 : player1;
            match.setWinner(winner);
            grantRewards(winner, XP_WIN, PTS_WIN);
            grantRewards(loser, XP_LOSS, PTS_LOSS);

            missionService.recordEvent(winner, MissionType.WIN_MATCHES);
        }

        missionService.recordEvent(player1, MissionType.PLAY_MATCHES);
        missionService.recordEvent(player2, MissionType.PLAY_MATCHES);

        match.setStatus(MatchStatus.FINISHED);
        return matchRepository.save(match);
    }

    public Optional<Match> findById(Long id) {
        return matchRepository.findById(id);
    }

    public List<Match> getMatchHistory(Long personId) {
        Person person = findPersonOrThrow(personId);
        return matchRepository.findByPersonOrderByDateDesc(person);
    }

    public List<Match> getActiveMatches(Long personId) {
        Person person = findPersonOrThrow(personId);
        return matchRepository.findByPersonAndStatus(person, MatchStatus.IN_PROGRESS);
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

        personRepository.save(person);
    }

    private Match findMatchOrThrow(Long id) {
        return matchRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Partida no encontrada"));
    }

    private Person findPersonOrThrow(Long id) {
        return personRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Persona no encontrada"));
    }
}
