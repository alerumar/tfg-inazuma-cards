package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.DeckCard;

public record DeckCardResponse(Long deckCardId, CardResponse card) {

    public static DeckCardResponse from(DeckCard dc) {
        return new DeckCardResponse(dc.getId(), CardResponse.from(dc.getCard()));
    }
}
