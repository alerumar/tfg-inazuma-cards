package com.tfg.inazuma.dto;

import jakarta.validation.constraints.Email;

public record UpdatePersonRequest(
        String name,
        String surname,
        String nickname,
        @Email(message = "El correo no tiene un formato válido") String email,
        String profilePhoto
) {}
