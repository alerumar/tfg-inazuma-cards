package com.tfg.inazuma.dto;

public record UpdatePersonRequest(
        String name,
        String surname,
        String nickname,
        String email,
        String profilePhoto
) {}
