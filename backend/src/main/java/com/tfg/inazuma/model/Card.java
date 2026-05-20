package com.tfg.inazuma.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    @NotBlank
    @Column(nullable = false)
    private String name;

    private String collection;   // "Inazuma Eleven 1", "Inazuma Eleven GO Galaxy"...

    private String team;

    private String nickname;

    private String imageUrl;

    @NotNull
    @Enumerated(EnumType.STRING)
    private CardType type;       // NORMAL o LEGEND

    @Enumerated(EnumType.STRING)
    @Column(name = "card_package")
    private CardPackage cardPackage;  // INAZUMA_ELEVEN o INAZUMA_ELEVEN_GO

    private String position;     // GK, DF, MF, FW

    private int rating;          // calculado automáticamente (0-99)

    @Min(0) @Max(99)
    private int attack;

    @Min(0) @Max(99)
    private int control;

    @Min(0) @Max(99)
    private int defense;
}
