package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.Card;
import com.tfg.inazuma.model.CardAttribute;
import com.tfg.inazuma.model.CardPosition;
import com.tfg.inazuma.model.CardType;

import java.util.Set;

public record CardStateDto(
        Long   cardId,
        String name,
        String imageUrl,
        CardType     type,
        CardPosition position,
        int rating,
        int attack,
        int control,
        int defense,
        boolean attackUsed,
        boolean controlUsed,
        boolean defenseUsed,
        
        boolean legendBlocked
) {
    public static CardStateDto from(Card card, Set<CardAttribute> usedAttributes, boolean legendBlocked) {
        return new CardStateDto(
                card.getId(),
                card.getName(),
                card.getImageUrl(),
                card.getType(),
                card.getPosition(),
                card.getRating(),
                card.getAttack(),
                card.getControl(),
                card.getDefense(),
                usedAttributes.contains(CardAttribute.ATTACK),
                usedAttributes.contains(CardAttribute.CONTROL),
                usedAttributes.contains(CardAttribute.DEFENSE),
                legendBlocked
        );
    }
}
