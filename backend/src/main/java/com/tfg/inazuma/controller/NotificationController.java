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

@GetMapping
    public ResponseEntity<List<NotificationResponse>> getAll(@PathVariable Long personId) {
        return ResponseEntity.ok(notificationService.getForUser(personId));
    }

@GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable Long personId) {
        return ResponseEntity.ok(Map.of("count", notificationService.countUnread(personId)));
    }

@PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@PathVariable Long personId) {
        notificationService.markAllRead(personId);
        return ResponseEntity.noContent().build();
    }
}
