package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.Person;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PersonResponse(
        Long id,
        String playerId,
        String name,
        String surname,
        String nickname,
        String email,
        String profilePhoto,
        int level,
        int experience,
        int totalExperience,
        int packPoints,
        int accumulatedPacks,
        LocalDateTime lastPackDate,
        LocalDate lastDailyReward,
        int cardCount,
        int friendCount,
        boolean online,         // true si lastSeen en los últimos 2 minutos
        boolean inActiveMatch   // true si el jugador tiene una partida activa en curso
) {
    /** Versión completa con conteos y estado de partida activa. */
    public static PersonResponse from(Person p, int cardCount, int friendCount, boolean inActiveMatch) {
        boolean isOnline = p.getLastSeen() != null
                && p.getLastSeen().isAfter(LocalDateTime.now().minusMinutes(2));
        return new PersonResponse(
                p.getId(),
                p.getPlayerId(),
                p.getName(),
                p.getSurname(),
                p.getNickname(),
                p.getEmail(),
                p.getProfilePhoto(),
                p.getLevel(),
                p.getExperience(),
                p.getTotalExperience(),
                p.getPackPoints(),
                p.getAccumulatedPacks(),
                p.getLastPackDate(),
                p.getLastDailyReward(),
                cardCount,
                friendCount,
                isOnline,
                inActiveMatch
        );
    }

    /** Versión con conteos pero sin información de partida activa (inActiveMatch = false). */
    public static PersonResponse from(Person p, int cardCount, int friendCount) {
        return from(p, cardCount, friendCount, false);
    }

    /** Compatibilidad hacia atrás — los conteos se calcularán a 0, inActiveMatch = false */
    public static PersonResponse from(Person p) {
        return from(p, 0, 0, false);
    }
}
