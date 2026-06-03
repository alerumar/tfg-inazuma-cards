package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.Match;
import com.tfg.inazuma.model.MatchStatus;

import java.time.LocalDateTime;

/** DTO ligero para listados (historial, banner de invitación). */
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
        /** Turnos ganados por el jugador 1 en la última ronda — útil para el sub-marcador del historial. */
        int         turnsWonPlayer1LastRound,
        /** Turnos ganados por el jugador 2 en la última ronda. */
        int         turnsWonPlayer2LastRound,
        /** true si la partida terminó por abandono voluntario o desconexión. */
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
