package com.tfg.inazuma.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** El usuario que recibe la notificación. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private Person recipient;

    /** El usuario que provocó la notificación (puede ser null en notificaciones del sistema). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private Person actor;

    /** Tipo: FRIEND_REQUEST_ACCEPTED | FRIEND_REQUEST_REJECTED */
    @Column(name = "notification_type", nullable = false, length = 64)
    private String type;

    @Column(nullable = false, length = 255)
    private String message;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
