package com.tfg.inazuma.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "matches")
@Data
@NoArgsConstructor
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Participantes ────────────────────────────────────────────────────────
    /** El jugador que mandó la invitación. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "player1_id")
    private Person player1;

    /** El jugador invitado. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "player2_id")
    private Person player2;

    // ── Barajas (se eligen en el lobby) ─────────────────────────────────────
    @ManyToOne
    @JoinColumn(name = "deck1_id")
    private Deck deck1;

    @ManyToOne
    @JoinColumn(name = "deck2_id")
    private Deck deck2;

    // ── Estado del lobby ─────────────────────────────────────────────────────
    @Column(nullable = false)
    private boolean player1Ready = false;

    @Column(nullable = false)
    private boolean player2Ready = false;

    // ── Puntuación ──────────────────────────────────────────────────────────
    @Column(nullable = false)
    private int roundsWonPlayer1 = 0;

    @Column(nullable = false)
    private int roundsWonPlayer2 = 0;

    // ── Regla Legend: racha de usos consecutivos por jugador ────────────────
    /** Cuántos turnos seguidos ha usado una carta Legend el jugador 1 (0, 1 o 2). */
    @Column(nullable = false)
    private int consecutiveLegendPlayer1 = 0;

    /** Cuántos turnos seguidos ha usado una carta Legend el jugador 2 (0, 1 o 2). */
    @Column(nullable = false)
    private int consecutiveLegendPlayer2 = 0;

    // ── Snapshot de turnos de la última ronda (para el DTO ligero del historial) ─
    /** Turnos ganados por el jugador 1 en la ronda en curso / última ronda jugada. */
    @Column(nullable = false)
    private int turnsWonPlayer1LastRound = 0;

    /** Turnos ganados por el jugador 2 en la ronda en curso / última ronda jugada. */
    @Column(nullable = false)
    private int turnsWonPlayer2LastRound = 0;

    // ── Anti-desconexión (RNF-04) ────────────────────────────────────────────
    private LocalDateTime lastActivityPlayer1;
    private LocalDateTime lastActivityPlayer2;

    // ── Resultado ────────────────────────────────────────────────────────────
    @ManyToOne
    @JoinColumn(name = "winner_id")
    private Person winner;

    /**
     * true cuando la partida terminó por abandono voluntario (forfeit)
     * o por desconexión prolongada — en lugar de terminar de forma natural.
     */
    @Column(nullable = false)
    private boolean wonByAbandon = false;

    // ── Revancha inmediata (estilo Brawl Stars) ──────────────────────────────
    /** true si el jugador 1 confirmó que quiere revancha. */
    @Column(nullable = false)
    private boolean player1WantsRematch = false;

    /** true si el jugador 2 confirmó que quiere revancha. */
    @Column(nullable = false)
    private boolean player2WantsRematch = false;

    /**
     * ID de la nueva partida creada cuando los dos jugadores votan que sí.
     * null mientras no se hayan confirmado ambos votos.
     */
    @Column
    private Long rematchMatchId;

    // ── Estado y metadatos ───────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchStatus status = MatchStatus.PENDING_INVITE;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
