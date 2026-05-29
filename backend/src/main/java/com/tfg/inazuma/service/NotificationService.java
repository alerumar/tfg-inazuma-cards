package com.tfg.inazuma.service;

import com.tfg.inazuma.dto.NotificationResponse;
import com.tfg.inazuma.model.Notification;
import com.tfg.inazuma.model.Person;
import com.tfg.inazuma.repository.NotificationRepository;
import com.tfg.inazuma.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final PersonRepository       personRepository;

    /** Crea y persiste una notificación. */
    public Notification create(Person recipient, Person actor, String type, String message) {
        Notification n = new Notification();
        n.setRecipient(recipient);
        n.setActor(actor);
        n.setType(type);
        n.setMessage(message);
        n.setRead(false);
        n.setCreatedAt(LocalDateTime.now());
        return notificationRepository.save(n);
    }

    /** Devuelve todas las notificaciones del usuario (más reciente primero). */
    public List<NotificationResponse> getForUser(Long personId) {
        Person person = findOrThrow(personId);
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(person)
                .stream().map(NotificationResponse::from).toList();
    }

    /** Cuenta las notificaciones no leídas del usuario. */
    public long countUnread(Long personId) {
        Person person = findOrThrow(personId);
        return notificationRepository.countByRecipientAndReadFalse(person);
    }

    /** Marca todas las notificaciones del usuario como leídas. */
    public void markAllRead(Long personId) {
        Person person = findOrThrow(personId);
        List<Notification> unread = notificationRepository.findByRecipientAndReadFalse(person);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    private Person findOrThrow(Long id) {
        return personRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Persona no encontrada"));
    }
}
