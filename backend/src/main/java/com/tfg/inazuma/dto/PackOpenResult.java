package com.tfg.inazuma.dto;

import java.util.List;

public record PackOpenResult(
        List<PackCardResult> cards
) {
    public record PackCardResult(
            CardResponse card,
            boolean isNew
    ) {}
}
