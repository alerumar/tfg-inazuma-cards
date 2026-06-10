package com.tfg.inazuma.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "friendships",
    uniqueConstraints = @UniqueConstraint(columnNames = {"requester_id", "receiver_id"})
)
@Data
@NoArgsConstructor
public class Friendship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "requester_id")
    private Person requester;

    @ManyToOne(optional = false)
    @JoinColumn(name = "receiver_id")
    private Person receiver;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FriendshipStatus status = FriendshipStatus.PENDING;
}
