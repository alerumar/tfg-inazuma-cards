package com.tfg.inazuma.controller;

import com.tfg.inazuma.dto.MatchResponse;
import com.tfg.inazuma.model.CardAttribute;
import com.tfg.inazuma.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

@PostMapping("/invite")
    public ResponseEntity<?> invite(@RequestBody Map<String, Long> body) {
        try {
            Long initiatorId = body.get("initiatorId");
            Long receiverId  = body.get("receiverId");
            if (initiatorId == null || receiverId == null)
                return ResponseEntity.badRequest().body("initiatorId y receiverId son obligatorios");
            return ResponseEntity.ok(matchService.invitePlayer(initiatorId, receiverId));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

@PatchMapping("/{id}/respond-invite")
    public ResponseEntity<?> respondInvite(@PathVariable Long id,
                                           @RequestBody Map<String, Object> body) {
        try {
            Long receiverId = ((Number) body.get("receiverId")).longValue();
            boolean accept  = (Boolean) body.get("accept");
            return ResponseEntity.ok(matchService.respondInvite(id, receiverId, accept));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

@PatchMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id,
                                    @RequestBody Map<String, Long> body) {
        try {
            return ResponseEntity.ok(matchService.cancelMatch(id, body.get("playerId")));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

@PatchMapping("/{id}/ready")
    public ResponseEntity<?> setReady(@PathVariable Long id,
                                      @RequestBody Map<String, Long> body) {
        try {
            Long playerId = body.get("playerId");
            Long deckId   = body.get("deckId");
            if (playerId == null || deckId == null)
                return ResponseEntity.badRequest().body("playerId y deckId son obligatorios");
            return ResponseEntity.ok(matchService.setReady(id, playerId, deckId));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

@PatchMapping("/{id}/unready")
    public ResponseEntity<?> unsetReady(@PathVariable Long id,
                                        @RequestBody Map<String, Long> body) {
        try {
            Long playerId = body.get("playerId");
            if (playerId == null)
                return ResponseEntity.badRequest().body("playerId es obligatorio");
            return ResponseEntity.ok(matchService.unsetReady(id, playerId));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

@GetMapping("/{id}/state")
    public ResponseEntity<?> getState(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(matchService.getState(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

@PostMapping("/{id}/move")
    public ResponseEntity<?> submitMove(@PathVariable Long id,
                                        @RequestBody Map<String, Object> body) {
        try {
            Long playerId  = ((Number) body.get("playerId")).longValue();
            Long cardId    = ((Number) body.get("cardId")).longValue();
            CardAttribute attribute = CardAttribute.valueOf((String) body.get("attribute"));
            return ResponseEntity.ok(matchService.submitMove(id, playerId, cardId, attribute));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

@PatchMapping("/{id}/heartbeat")
    public ResponseEntity<Void> heartbeat(@PathVariable Long id,
                                          @RequestBody Map<String, Long> body) {
        matchService.heartbeat(id, body.get("playerId"));
        return ResponseEntity.noContent().build();
    }

@PatchMapping("/{id}/forfeit")
    public ResponseEntity<?> forfeit(@PathVariable Long id,
                                     @RequestBody Map<String, Long> body) {
        try {
            return ResponseEntity.ok(matchService.forfeit(id, body.get("playerId")));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

@PatchMapping("/{id}/rematch-vote")
    public ResponseEntity<?> rematchVote(@PathVariable Long id,
                                         @RequestBody Map<String, Object> body) {
        try {
            Long playerId = ((Number) body.get("playerId")).longValue();
            boolean wants = (Boolean) body.get("wants");
            return ResponseEntity.ok(matchService.voteRematch(id, playerId, wants));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

@GetMapping("/persons/{personId}/active")
    public List<MatchResponse> getActive(@PathVariable Long personId) {
        return matchService.getActive(personId);
    }

@GetMapping("/persons/{personId}/pending-invites")
    public List<MatchResponse> getPendingInvites(@PathVariable Long personId) {
        return matchService.getPendingInvites(personId);
    }

@GetMapping("/persons/{personId}/history")
    public List<MatchResponse> getHistory(@PathVariable Long personId) {
        return matchService.getHistory(personId);
    }
}
