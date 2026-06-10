package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.PersonCard;

public record PersonCardResponse(
        Long id,
        CardResponse card,
        int quantity
) {
    public static PersonCardResponse from(PersonCard pc) {
        return new PersonCardResponse(pc.getId(), CardResponse.from(pc.getCard()), pc.getQuantity());
    }
}
