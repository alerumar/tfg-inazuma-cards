package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.Card;
import com.tfg.inazuma.model.CardPackage;
import com.tfg.inazuma.model.CardPosition;
import com.tfg.inazuma.model.CardType;

public record CardResponse(
        Long id,
        String name,
        String collection,
        String team,
        String nickname,
        String imageUrl,
        CardType type,
        CardPackage cardPackage,
        CardPosition position,
        int rating,
        int attack,
        int control,
        int defense
) {
    public static CardResponse from(Card c) {
        return new CardResponse(
                c.getId(),
                c.getName(),
                c.getCollection(),
                c.getTeam(),
                c.getNickname(),
                c.getImageUrl(),
                c.getType(),
                c.getCardPackage(),
                c.getPosition(),
                c.getRating(),
                c.getAttack(),
                c.getControl(),
                c.getDefense()
        );
    }
}
