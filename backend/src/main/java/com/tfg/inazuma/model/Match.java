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

    @ManyToOne(optional = false)
    @JoinColumn(name = "player1_id")
    private Person player1;

    @ManyToOne(optional = false)
    @JoinColumn(name = "player2_id")
    private Person player2;

    @ManyToOne
    @JoinColumn(name = "deck1_id")
    private Deck deck1;

    @ManyToOne
    @JoinColumn(name = "deck2_id")
    private Deck deck2;

    @ManyToOne
    @JoinColumn(name = "winner_id")
    private Person winner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchStatus status = MatchStatus.WAITING_DECKS;

    @Column(nullable = false)
    private LocalDateTime date = LocalDateTime.now();
}
