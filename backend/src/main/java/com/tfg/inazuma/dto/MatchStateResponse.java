package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.MatchStatus;

import java.time.LocalDateTime;
import java.util.List;

public record MatchStateResponse(
        Long        id,
        MatchStatus status,

        PersonResponse player1,
        PersonResponse player2,

        Long    deck1Id,
        Long    deck2Id,
        boolean player1Ready,
        boolean player2Ready,

        int roundsWonPlayer1,
        int roundsWonPlayer2,

        int currentRoundNumber,
        int turnsWonPlayer1InRound,
        int turnsWonPlayer2InRound,

        List<CardStateDto> player1Cards,
        List<CardStateDto> player2Cards,

        TurnStateDto pendingTurn,

        TurnStateDto lastCompletedTurn,

        Long    winnerId,
        boolean draw,

boolean wonByAbandon,

        int rewardXpPlayer1,
        int rewardPackPointsPlayer1,
        int rewardXpPlayer2,
        int rewardPackPointsPlayer2,

        LocalDateTime createdAt,

        boolean player1WantsRematch,
        boolean player2WantsRematch,
        
        Long rematchMatchId,

boolean player1Connected,
        boolean player2Connected
) {}
