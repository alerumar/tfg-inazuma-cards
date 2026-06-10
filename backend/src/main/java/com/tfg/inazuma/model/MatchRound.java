package com.tfg.inazuma.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "match_rounds")
@Data
@NoArgsConstructor
public class MatchRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "match_id")
    private Match match;

    @Column(nullable = false)
    private int roundNumber;

    @Column(nullable = false)
    private int turnsWonPlayer1 = 0;

    @Column(nullable = false)
    private int turnsWonPlayer2 = 0;

@Column(nullable = false)
    private boolean completed = false;
}
