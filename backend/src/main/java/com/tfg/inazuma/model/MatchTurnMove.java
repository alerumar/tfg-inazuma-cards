package com.tfg.inazuma.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Jugada individual de un jugador en un turno.
 * Al usar una fila por jugador (en vez de columnas p1_... y p2_... en la misma fila),
 * dos jugadores pueden enviar su jugada de forma concurrente sin sobreescribirse.
 * La restricción única (turn_id, player_id) garantiza idempotencia a nivel de BD.
 */
@Entity
@Table(name = "match_turn_moves",
    uniqueConstraints = @UniqueConstraint(columnNames = {"turn_id", "player_id"}))
@Data
@NoArgsConstructor
public class MatchTurnMove {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "turn_id")
    private MatchTurn turn;

    @ManyToOne(optional = false)
    @JoinColumn(name = "player_id")
    private Person player;

    @ManyToOne
    @JoinColumn(name = "card_id")
    private Card card;

    @Enumerated(EnumType.STRING)
    @Column(name = "attribute")
    private CardAttribute attribute;

    private LocalDateTime submittedAt;
}
