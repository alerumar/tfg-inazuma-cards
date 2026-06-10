package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Notification;
import com.tfg.inazuma.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

List<Notification> findByRecipientOrderByCreatedAtDesc(Person recipient);

long countByRecipientAndReadFalse(Person recipient);

List<Notification> findByRecipientAndReadFalse(Person recipient);

@Modifying
    @Query("DELETE FROM Notification n WHERE n.recipient.id = :personId OR n.actor.id = :personId")
    void deleteByPersonId(@Param("personId") Long personId);
}
