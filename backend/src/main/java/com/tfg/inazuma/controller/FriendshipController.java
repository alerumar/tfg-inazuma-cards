package com.tfg.inazuma.controller;

import com.tfg.inazuma.dto.FriendshipResponse;
import com.tfg.inazuma.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/persons/{personId}/friendships")
@RequiredArgsConstructor
public class FriendshipController {

    private final FriendshipService friendshipService;

    @PostMapping("/request/{receiverPlayerId}")
    public ResponseEntity<?> sendRequest(@PathVariable Long personId,
                                         @PathVariable String receiverPlayerId) {
        try {
            return ResponseEntity.ok(FriendshipResponse.from(
                    friendshipService.sendRequest(personId, receiverPlayerId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{friendshipId}/accept")
    public ResponseEntity<?> accept(@PathVariable Long personId,
                                    @PathVariable Long friendshipId) {
        try {
            return ResponseEntity.ok(FriendshipResponse.from(
                    friendshipService.accept(friendshipId, personId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{friendshipId}/reject")
    public ResponseEntity<?> reject(@PathVariable Long personId,
                                    @PathVariable Long friendshipId) {
        try {
            friendshipService.reject(friendshipId, personId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{friendshipId}")
    public ResponseEntity<?> removeFriend(@PathVariable Long personId,
                                          @PathVariable Long friendshipId) {
        try {
            friendshipService.removeFriend(personId, friendshipId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public List<FriendshipResponse> getFriends(@PathVariable Long personId) {
        return friendshipService.getFriends(personId);
    }

    @GetMapping("/pending/received")
    public List<FriendshipResponse> getPendingReceived(@PathVariable Long personId) {
        return friendshipService.getPendingReceived(personId).stream()
                .map(FriendshipResponse::from).toList();
    }

    @GetMapping("/pending/sent")
    public List<FriendshipResponse> getPendingSent(@PathVariable Long personId) {
        return friendshipService.getPendingSent(personId).stream()
                .map(FriendshipResponse::from).toList();
    }

@GetMapping("/search")
    public ResponseEntity<?> search(@PathVariable Long personId,
                                    @RequestParam String q) {
        if (q == null || q.trim().length() < 2)
            return ResponseEntity.badRequest().body("Escribe al menos 2 caracteres para buscar");
        return ResponseEntity.ok(friendshipService.searchPersons(personId, q.trim()));
    }
}
