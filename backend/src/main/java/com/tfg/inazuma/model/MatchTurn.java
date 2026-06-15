package com.tfg.inazuma.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Turno dentro de una ronda.
 * Las jugadas concretas de cada jugador viven en {@link MatchTurnMove},
 * una fila por jugador, eliminando la carrera de escritura anterior.
 */
@Entity
@Table(name = "match_turns")
@Data
@NoArgsConstructor
public class MatchTurn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "round_id")
    private MatchRound round;

    @Column(nullable = false)
    private int turnNumber;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TurnResult result = TurnResult.PENDING;
}
