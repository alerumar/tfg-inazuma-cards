package com.tfg.inazuma.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "persons")
@Data
@NoArgsConstructor
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 8)
    private String playerId;

    @NotBlank
    @Column(nullable = false)
    private String name;

    private String surname;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String nickname;

    @NotBlank
    @Email
    @Column(nullable = false, unique = true)
    private String email;

    @NotBlank
    @Column(nullable = false)
    private String passwordHash;

    private String profilePhoto;

    @Column(nullable = false)
    private int level = 1;

    @Column(nullable = false)
    private int experience = 0;

    @Column(nullable = false)
    private int totalExperience = 0;

    @Column(nullable = false)
    private int packPoints = 0;

    @Column(nullable = false)
    private int accumulatedPacks = 0;

    private LocalDateTime lastPackDate;

    private LocalDate lastDailyReward;
}
