package com.tfg.inazuma.dto;

public record PersonSearchResult(
        PersonResponse person,
        String  relationshipStatus,   // null | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED"
        Long    friendshipId          // null si no hay relación
) {}
