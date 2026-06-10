package com.tfg.inazuma.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "missions")
@Data
@NoArgsConstructor
public class Mission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MissionType type;

    @Min(1)
    @Column(nullable = false)
    private int goal;

    @Column(nullable = false)
    private int rewardExperience = 0;

    @Column(nullable = false)
    private int rewardPoints = 0;
}
