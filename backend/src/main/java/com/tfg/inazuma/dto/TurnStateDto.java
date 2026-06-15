package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.CardAttribute;
import com.tfg.inazuma.model.MatchTurn;
import com.tfg.inazuma.model.MatchTurnMove;
import com.tfg.inazuma.model.TurnResult;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

public record TurnStateDto(

        int    roundNumber,
        int    turnNumber,
        String turnCreatedAt,
        int    turnSecondsRemaining,
        boolean       player1Submitted,
        boolean       player2Submitted,
        Long          player1CardId,
        String        player1CardName,
        String        player1CardImage,
        CardAttribute player1Attribute,
        Integer       player1Value,
        Long          player2CardId,
        String        player2CardName,
        String        player2CardImage,
        CardAttribute player2Attribute,
        Integer       player2Value,
        TurnResult    result
) {
    private static final int TURN_TIMEOUT_SECONDS = 45;

    /**
     * @param t      el turno
     * @param moveP1 jugada de match.getPlayer1() — null si aún no envió
     * @param moveP2 jugada de match.getPlayer2() — null si aún no envió
     */
    public static TurnStateDto from(MatchTurn t, MatchTurnMove moveP1, MatchTurnMove moveP2) {
        boolean revealed = t.getResult() != TurnResult.PENDING;
        int secRemaining = revealed ? 0
                : (int) Math.max(0, TURN_TIMEOUT_SECONDS
                        - ChronoUnit.SECONDS.between(t.getCreatedAt(), LocalDateTime.now()));

        return new TurnStateDto(
                t.getRound().getRoundNumber(),
                t.getTurnNumber(),
                t.getCreatedAt().toString(),
                secRemaining,
                moveP1 != null,
                moveP2 != null,
                revealed && moveP1 != null ? moveP1.getCard().getId()       : null,
                revealed && moveP1 != null ? moveP1.getCard().getName()     : null,
                revealed && moveP1 != null ? moveP1.getCard().getImageUrl() : null,
                revealed && moveP1 != null ? moveP1.getAttribute()          : null,
                revealed && moveP1 != null ? attrValue(moveP1)              : null,
                revealed && moveP2 != null ? moveP2.getCard().getId()       : null,
                revealed && moveP2 != null ? moveP2.getCard().getName()     : null,
                revealed && moveP2 != null ? moveP2.getCard().getImageUrl() : null,
                revealed && moveP2 != null ? moveP2.getAttribute()          : null,
                revealed && moveP2 != null ? attrValue(moveP2)              : null,
                t.getResult()
        );
    }

    private static int attrValue(MatchTurnMove move) {
        if (move.getAttribute() == null) return 0;
        return switch (move.getAttribute()) {
            case ATTACK  -> move.getCard().getAttack();
            case CONTROL -> move.getCard().getControl();
            case DEFENSE -> move.getCard().getDefense();
        };
    }
}
