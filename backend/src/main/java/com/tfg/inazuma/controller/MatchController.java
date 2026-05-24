package com.tfg.inazuma.controller;

import com.tfg.inazuma.dto.MatchResponse;
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

    @PostMapping
    public ResponseEntity<?> createMatch(@RequestBody Map<String, Long> body) {
        try {
            Long player1Id = body.get("player1Id");
            Long player2Id = body.get("player2Id");
            if (player1Id == null || player2Id == null)
                return ResponseEntity.badRequest().body("player1Id y player2Id son obligatorios");
            return ResponseEntity.ok(MatchResponse.from(matchService.createMatch(player1Id, player2Id)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<MatchResponse> findById(@PathVariable Long id) {
        return matchService.findById(id)
                .map(m -> ResponseEntity.ok(MatchResponse.from(m)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/deck")
    public ResponseEntity<?> chooseDeck(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        try {
            Long personId = body.get("personId");
            Long deckId = body.get("deckId");
            if (personId == null || deckId == null)
                return ResponseEntity.badRequest().body("personId y deckId son obligatorios");
            return ResponseEntity.ok(MatchResponse.from(matchService.chooseDeck(id, personId, deckId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/finish")
    public ResponseEntity<?> finishMatch(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        try {
            Long winnerId = body.get("winnerId");
            return ResponseEntity.ok(MatchResponse.from(matchService.finishMatch(id, winnerId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/persons/{personId}/history")
    public List<MatchResponse> getHistory(@PathVariable Long personId) {
        return matchService.getMatchHistory(personId).stream()
                .map(MatchResponse::from).toList();
    }

    @GetMapping("/persons/{personId}/active")
    public List<MatchResponse> getActive(@PathVariable Long personId) {
        return matchService.getActiveMatches(personId).stream()
                .map(MatchResponse::from).toList();
    }
}
