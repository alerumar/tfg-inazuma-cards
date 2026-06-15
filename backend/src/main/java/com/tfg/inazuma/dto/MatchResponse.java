package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.Match;
import com.tfg.inazuma.model.MatchPlayer;
import com.tfg.inazuma.model.MatchStatus;

import java.time.LocalDateTime;

public record MatchResponse(
        Long          id,
        MatchStatus   status,
        PersonResponse player1,
        PersonResponse player2,
        Long          deck1Id,
        Long          deck2Id,
        boolean       player1Ready,
        boolean       player2Ready,
        int           roundsWonPlayer1,
        int           roundsWonPlayer2,
        int           turnsWonPlayer1LastRound,
        int           turnsWonPlayer2LastRound,
        boolean       wonByAbandon,
        Long          winnerId,
        LocalDateTime createdAt
) {
    /**
     * @param mp1 MatchPlayer de match.getPlayer1()
     * @param mp2 MatchPlayer de match.getPlayer2()
     */
    public static MatchResponse from(Match m, MatchPlayer mp1, MatchPlayer mp2) {
        return new MatchResponse(
                m.getId(),
                m.getStatus(),
                PersonResponse.from(m.getPlayer1()),
                PersonResponse.from(m.getPlayer2()),
                mp1.getDeck() != null ? mp1.getDeck().getId() : null,
                mp2.getDeck() != null ? mp2.getDeck().getId() : null,
                mp1.isReady(),
                mp2.isReady(),
                mp1.getRoundsWon(),
                mp2.getRoundsWon(),
                mp1.getTurnsWonLastRound(),
                mp2.getTurnsWonLastRound(),
                m.isWonByAbandon(),
                m.getWinner() != null ? m.getWinner().getId() : null,
                m.getCreatedAt()
        );
    }
}
