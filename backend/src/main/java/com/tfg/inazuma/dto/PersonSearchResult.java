package com.tfg.inazuma.dto;

/**
 * Resultado de búsqueda de persona: incluye la relación de amistad actual
 * con el usuario que busca (null si no existe ninguna).
 */
public record PersonSearchResult(
        PersonResponse person,
        String  relationshipStatus,   // null | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED"
        Long    friendshipId          // null si no hay relación
) {}
