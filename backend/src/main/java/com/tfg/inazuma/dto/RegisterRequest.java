package com.tfg.inazuma.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank String name,
        String surname,
        @NotBlank String nickname,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres") String password
) {}
