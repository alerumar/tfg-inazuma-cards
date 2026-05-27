package com.tfg.inazuma.dto;

/** Respuesta al reclamar una misión: devuelve la misión actualizada y el jugador actualizado */
public record ClaimRewardResponse(
        PersonMissionResponse mission,
        PersonResponse person
) {}
