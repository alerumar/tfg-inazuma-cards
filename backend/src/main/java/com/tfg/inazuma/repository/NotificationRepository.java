package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Notification;
import com.tfg.inazuma.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** Todas las notificaciones de un usuario, más reciente primero. */
    List<Notification> findByRecipientOrderByCreatedAtDesc(Person recipient);

    /** Cuántas no leídas tiene el usuario. */
    long countByRecipientAndReadFalse(Person recipient);

    /** Las no leídas (para marcarlas todas de golpe). */
    List<Notification> findByRecipientAndReadFalse(Person recipient);
}
