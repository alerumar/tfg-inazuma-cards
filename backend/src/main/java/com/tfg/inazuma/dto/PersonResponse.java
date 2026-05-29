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
        boolean online          // true si lastSeen en los últimos 15 minutos
) {
    /** Versión completa con conteos */
    public static PersonResponse from(Person p, int cardCount, int friendCount) {
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
                isOnline
        );
    }

    /** Compatibilidad hacia atrás — los conteos se calcularán a 0 */
    public static PersonResponse from(Person p) {
        return from(p, 0, 0);
    }
}
