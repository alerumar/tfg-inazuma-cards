package com.tfg.inazuma.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "person_missions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"person_id", "mission_id"})
)
@Data
@NoArgsConstructor
public class PersonMission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "person_id")
    private Person person;

    @ManyToOne(optional = false)
    @JoinColumn(name = "mission_id")
    private Mission mission;

    @Column(nullable = false)
    private int progress = 0;

    /** true cuando el jugador ha reclamado las recompensas manualmente */
    @Column(nullable = false)
    private boolean claimed = false;
}
