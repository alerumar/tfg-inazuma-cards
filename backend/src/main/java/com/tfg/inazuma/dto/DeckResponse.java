package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.Deck;

import java.util.List;

public record DeckResponse(
        Long id,
        String name,
        List<CardResponse> cards
) {
    public static DeckResponse from(Deck deck, List<CardResponse> cards) {
        return new DeckResponse(deck.getId(), deck.getName(), cards);
    }
}
