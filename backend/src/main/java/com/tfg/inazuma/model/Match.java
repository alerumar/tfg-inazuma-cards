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

    @Column(nullable = false)
    private boolean player1Ready = false;

    @Column(nullable = false)
    private boolean player2Ready = false;

    @Column(nullable = false)
    private int roundsWonPlayer1 = 0;

    @Column(nullable = false)
    private int roundsWonPlayer2 = 0;

@Column(nullable = false)
    private int consecutiveLegendPlayer1 = 0;

@Column(nullable = false)
    private int consecutiveLegendPlayer2 = 0;

@Column(nullable = false)
    private int turnsWonPlayer1LastRound = 0;

@Column(nullable = false)
    private int turnsWonPlayer2LastRound = 0;

    private LocalDateTime lastActivityPlayer1;
    private LocalDateTime lastActivityPlayer2;

    @ManyToOne
    @JoinColumn(name = "winner_id")
    private Person winner;

@Column(nullable = false)
    private boolean wonByAbandon = false;

@Column(nullable = false)
    private boolean player1WantsRematch = false;

@Column(nullable = false)
    private boolean player2WantsRematch = false;

@Column
    private Long rematchMatchId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatchStatus status = MatchStatus.PENDING_INVITE;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
