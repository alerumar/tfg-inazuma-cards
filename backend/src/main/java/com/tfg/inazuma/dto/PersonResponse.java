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
        LocalDate lastDailyReward
) {
    public static PersonResponse from(Person p) {
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
                p.getLastDailyReward()
        );
    }
}
