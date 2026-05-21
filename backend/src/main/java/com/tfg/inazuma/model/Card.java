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

    private String collection;

    private String team;

    private String nickname;

    private String imageUrl;

    @NotNull
    @Enumerated(EnumType.STRING)
    private CardType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "card_package")
    private CardPackage cardPackage;

    @Enumerated(EnumType.STRING)
    private CardPosition position;

    @Column(nullable = false)
    private int rating;          // auto-calculado antes de cada INSERT/UPDATE

    @Min(0) @Max(99)
    private int attack;

    @Min(0) @Max(99)
    private int control;

    @Min(0) @Max(99)
    private int defense;

    @PrePersist
    @PreUpdate
    private void recomputeRating() {
        this.rating = computeRating(position, attack, control, defense);
    }

    /**
     * POR:  D^1.08 × 0.70 + C × 0.30
     * DF:  D^1.05 × 0.60 + C × 0.30 + A × 0.10
     * MC:  C^1.05 × 0.45 + A × 0.275 + D × 0.275
     * DC:  A^1.05 × 0.65 + C × 0.25  + D × 0.10
     */
    public static int computeRating(CardPosition position, int attack, int control, int defense) {
        double r = (position == null) ? (attack + control + defense) / 3.0 : switch (position) {
            case POR -> Math.pow(defense  / 100.0, 1.08) * 100 * 0.70 + control * 0.30;
            case DF -> Math.pow(defense  / 100.0, 1.05) * 100 * 0.60 + control * 0.30 + attack * 0.10;
            case MC -> Math.pow(control  / 100.0, 1.05) * 100 * 0.45 + attack  * 0.275 + defense * 0.275;
            case DC -> Math.pow(attack   / 100.0, 1.05) * 100 * 0.65 + control * 0.25  + defense * 0.10;
            default   -> (attack + control + defense) / 3.0;
        };
        return Math.max(0, Math.min(99, (int) Math.round(r)));
    }
}
