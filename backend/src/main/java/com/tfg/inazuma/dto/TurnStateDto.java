package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.CardAttribute;
import com.tfg.inazuma.model.MatchTurn;
import com.tfg.inazuma.model.TurnResult;

import java.time.LocalDateTime;

public record TurnStateDto(
        
        int        roundNumber,
        int        turnNumber,
        LocalDateTime turnCreatedAt,
        boolean    player1Submitted,
        boolean    player2Submitted,
        Long       player1CardId,
        String     player1CardName,
        String     player1CardImage,
        CardAttribute player1Attribute,
        Integer    player1Value,
        Long       player2CardId,
        String     player2CardName,
        String     player2CardImage,
        CardAttribute player2Attribute,
        Integer    player2Value,
        TurnResult result
) {
    public static TurnStateDto from(MatchTurn t) {
        boolean revealed = t.getResult() != TurnResult.PENDING;
        return new TurnStateDto(
                t.getRound().getRoundNumber(),
                t.getTurnNumber(),
                t.getCreatedAt(),
                t.getPlayer1SubmittedAt() != null,
                t.getPlayer2SubmittedAt() != null,
                revealed && t.getPlayer1Card() != null ? t.getPlayer1Card().getId()       : null,
                revealed && t.getPlayer1Card() != null ? t.getPlayer1Card().getName()     : null,
                revealed && t.getPlayer1Card() != null ? t.getPlayer1Card().getImageUrl() : null,
                revealed ? t.getPlayer1Attribute() : null,
                revealed && t.getPlayer1Card() != null ? attrValue(t.getPlayer1Card(), t.getPlayer1Attribute()) : null,
                revealed && t.getPlayer2Card() != null ? t.getPlayer2Card().getId()       : null,
                revealed && t.getPlayer2Card() != null ? t.getPlayer2Card().getName()     : null,
                revealed && t.getPlayer2Card() != null ? t.getPlayer2Card().getImageUrl() : null,
                revealed ? t.getPlayer2Attribute() : null,
                revealed && t.getPlayer2Card() != null ? attrValue(t.getPlayer2Card(), t.getPlayer2Attribute()) : null,
                t.getResult()
        );
    }

    private static int attrValue(com.tfg.inazuma.model.Card card, CardAttribute attr) {
        if (attr == null) return 0;
        return switch (attr) {
            case ATTACK  -> card.getAttack();
            case CONTROL -> card.getControl();
            case DEFENSE -> card.getDefense();
        };
    }
}
