package com.tfg.inazuma.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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

    @ManyToOne
    @JoinColumn(name = "p1_card_id")
    private Card player1Card;

    @Enumerated(EnumType.STRING)
    @Column(name = "p1_attribute")
    private CardAttribute player1Attribute;

    private LocalDateTime player1SubmittedAt;

    @ManyToOne
    @JoinColumn(name = "p2_card_id")
    private Card player2Card;

    @Enumerated(EnumType.STRING)
    @Column(name = "p2_attribute")
    private CardAttribute player2Attribute;

    private LocalDateTime player2SubmittedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TurnResult result = TurnResult.PENDING;
}
