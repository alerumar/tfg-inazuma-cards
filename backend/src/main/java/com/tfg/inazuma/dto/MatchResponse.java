package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.Match;
import com.tfg.inazuma.model.MatchStatus;

import java.time.LocalDateTime;

public record MatchResponse(
        Long        id,
        MatchStatus status,
        PersonResponse player1,
        PersonResponse player2,
        Long        deck1Id,
        Long        deck2Id,
        boolean     player1Ready,
        boolean     player2Ready,
        int         roundsWonPlayer1,
        int         roundsWonPlayer2,
        
        int         turnsWonPlayer1LastRound,
        
        int         turnsWonPlayer2LastRound,
        
        boolean     wonByAbandon,
        Long        winnerId,
        LocalDateTime createdAt
) {
    public static MatchResponse from(Match m) {
        return new MatchResponse(
                m.getId(),
                m.getStatus(),
                PersonResponse.from(m.getPlayer1()),
                PersonResponse.from(m.getPlayer2()),
                m.getDeck1() != null ? m.getDeck1().getId() : null,
                m.getDeck2() != null ? m.getDeck2().getId() : null,
                m.isPlayer1Ready(),
                m.isPlayer2Ready(),
                m.getRoundsWonPlayer1(),
                m.getRoundsWonPlayer2(),
                m.getTurnsWonPlayer1LastRound(),
                m.getTurnsWonPlayer2LastRound(),
                m.isWonByAbandon(),
                m.getWinner() != null ? m.getWinner().getId() : null,
                m.getCreatedAt()
        );
    }
}
