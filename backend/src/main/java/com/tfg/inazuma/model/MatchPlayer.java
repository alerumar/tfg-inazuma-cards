package com.tfg.inazuma.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Fila independiente por jugador dentro de una partida.
 * Evita la carrera de escritura que ocurría cuando dos jugadores
 * modificaban simultáneamente la única fila de {@link Match}.
 */
@Entity
@Table(name = "match_players",
       uniqueConstraints = @UniqueConstraint(columnNames = {"match_id", "player_id"}))
@Data
@NoArgsConstructor
public class MatchPlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "match_id")
    private Match match;

    @ManyToOne(optional = false)
    @JoinColumn(name = "player_id")
    private Person player;

    @ManyToOne
    @JoinColumn(name = "deck_id")
    private Deck deck;

    @Column(nullable = false)
    private boolean ready = false;

    @Column(nullable = false)
    private int roundsWon = 0;

    @Column(nullable = false)
    private int consecutiveLegend = 0;

    /** Turnos ganados en la última ronda completada (usado en MatchResponse y desempate). */
    @Column(nullable = false)
    private int turnsWonLastRound = 0;

    private LocalDateTime lastActivity;

    @Column(nullable = false)
    private boolean wantsRematch = false;

    public MatchPlayer(Match match, Person player) {
        this.match  = match;
        this.player = player;
    }
}
