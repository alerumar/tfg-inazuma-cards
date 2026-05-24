package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.Match;
import com.tfg.inazuma.model.MatchStatus;

import java.time.LocalDateTime;

public record MatchResponse(
        Long id,
        PersonResponse player1,
        PersonResponse player2,
        Long deck1Id,
        Long deck2Id,
        Long winnerId,
        MatchStatus status,
        LocalDateTime date
) {
    public static MatchResponse from(Match m) {
        return new MatchResponse(
                m.getId(),
                PersonResponse.from(m.getPlayer1()),
                PersonResponse.from(m.getPlayer2()),
                m.getDeck1() != null ? m.getDeck1().getId() : null,
                m.getDeck2() != null ? m.getDeck2().getId() : null,
                m.getWinner() != null ? m.getWinner().getId() : null,
                m.getStatus(),
                m.getDate()
        );
    }
}
