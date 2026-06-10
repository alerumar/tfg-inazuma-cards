package com.tfg.inazuma.dto;

public record CollectionEntryResponse(
        CardResponse card,
        boolean owned,
        int quantity
) {}
