package com.tfg.inazuma.controller;

import com.tfg.inazuma.dto.NotificationResponse;
import com.tfg.inazuma.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/persons/{personId}/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /** GET /api/persons/{personId}/notifications — lista todas las notificaciones */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getAll(@PathVariable Long personId) {
        return ResponseEntity.ok(notificationService.getForUser(personId));
    }

    /** GET /api/persons/{personId}/notifications/unread-count — número de no leídas */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable Long personId) {
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(personId)));
    }

    /** PATCH /api/persons/{personId}/notifications/read-all — marca todas como leídas */
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@PathVariable Long personId) {
        notificationService.markAllRead(personId);
        return ResponseEntity.noContent().build();
    }
}
