package com.tfg.inazuma.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "cards")
@Data
@NoArgsConstructor
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String nickname;

    @Column(length = 1000)
    private String description;

    private String position;   // GK, DF, MF, FW
    private String element;    // Earth, Fire, Wind, Wood
    private String team;
    private String game;
    private String gender;

    private int attack;        // mapeado desde Kick   (0-99)
    private int control;       // mapeado desde Control (0-99)
    private int defense;       // mapeado desde Guard   (0-99)
    private int rating;        // media ponderada según posición (0-99)

    @Enumerated(EnumType.STRING)
    private CardType type;     // NORMAL o LEGEND

    @Column(length = 500)
    private String spriteUrl;
}
