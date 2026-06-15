package com.tfg.inazuma.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Metadatos de la partida: participantes, estado, resultado y rematch.
 * Los datos por jugador (baraja, listos, rondas ganadas, actividad…) viven
 * en {@link MatchPlayer}, una fila independiente por jugador.
 */
@Entity
@Table(name = "matches")
@Data
@NoArgsConstructor
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Jugador que envió la invitación (ordena la presentación en el frontend). */
    @ManyToOne(optional = false)
    @JoinColumn(name = "player1_id")
    private Person player1;

    /** Jugador que recibió la invitación. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "player2_id")
    private Person player2;

    @ManyToOne
    @JoinColumn(name = "winner_id")
    private Person winner;

    @Column(nullable = false)
    private boolean wonByAbandon = false;

    @Column
    private Long rematchMatchId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchStatus status = MatchStatus.PENDING_INVITE;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
