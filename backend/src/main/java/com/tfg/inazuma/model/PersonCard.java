package com.tfg.inazuma.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "person_cards",
    uniqueConstraints = @UniqueConstraint(columnNames = {"person_id", "card_id"})
)
@Data
@NoArgsConstructor
public class PersonCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "person_id")
    private Person person;

    @ManyToOne(optional = false)
    @JoinColumn(name = "card_id")
    private Card card;

    @Column(nullable = false)
    private int quantity = 1;
}
