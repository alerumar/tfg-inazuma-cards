package com.tfg.inazuma.dto;

public record PersonSearchResult(
        PersonResponse person,
        String  relationshipStatus,   
        Long    friendshipId        
) {}
