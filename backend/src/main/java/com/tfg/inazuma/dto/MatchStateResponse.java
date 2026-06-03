package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.MatchStatus;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Respuesta completa del estado de una partida.
 * Se usa para el polling durante el juego.
 */
public record MatchStateResponse(
        Long        id,
        MatchStatus status,

        // Jugadores
        PersonResponse player1,
        PersonResponse player2,

        // Lobby
        Long    deck1Id,
        Long    deck2Id,
        boolean player1Ready,
        boolean player2Ready,

        // Puntuación global
        int roundsWonPlayer1,
        int roundsWonPlayer2,

        // Ronda actual
        int currentRoundNumber,
        int turnsWonPlayer1InRound,
        int turnsWonPlayer2InRound,

        // Estado de las cartas de cada jugador
        // (cada jugador ve las suyas completas; el cliente filtra qué mostrar del rival)
        List<CardStateDto> player1Cards,
        List<CardStateDto> player2Cards,

        // Turno actual (pendiente de que los dos jueguen)
        TurnStateDto pendingTurn,

        // Último turno completado (para la animación de reveal)
        TurnStateDto lastCompletedTurn,

        // Resultado final
        Long    winnerId,   // null = empate o no terminada
        boolean draw,

        /** true si la partida terminó por forfeit o desconexión (no por resultado normal). */
        boolean wonByAbandon,

        // Recompensas obtenidas — solo significativas cuando status = FINISHED
        int rewardXpPlayer1,
        int rewardPackPointsPlayer1,
        int rewardXpPlayer2,
        int rewardPackPointsPlayer2,

        LocalDateTime createdAt,

        // Revancha inmediata — ambos jugadores deben votar sí en ≤ 30 s
        boolean player1WantsRematch,
        boolean player2WantsRematch,
        /** ID de la nueva partida creada cuando los dos aceptan; null hasta entonces. */
        Long rematchMatchId,

        /**
         * true si el jugador envió un heartbeat en los últimos 35 s.
         * Permite al cliente distinguir rival lento de rival desconectado.
         */
        boolean player1Connected,
        boolean player2Connected
) {}
