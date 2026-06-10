package com.tfg.inazuma.controller;

import com.tfg.inazuma.dto.CreateDeckRequest;
import com.tfg.inazuma.dto.DeckCardResponse;
import com.tfg.inazuma.dto.DeckResponse;
import com.tfg.inazuma.service.DeckService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/persons/{personId}/decks")
@RequiredArgsConstructor
public class DeckController {

    private final DeckService deckService;

    private List<DeckCardResponse> getCardResponses(Long deckId) {
        return deckService.getCards(deckId).stream()
                .map(DeckCardResponse::from)
                .toList();
    }

    @GetMapping
    public List<DeckResponse> getDecks(@PathVariable Long personId) {
        return deckService.getDecks(personId).stream()
                .map(deck -> DeckResponse.from(deck, getCardResponses(deck.getId())))
                .toList();
    }

    @GetMapping("/{deckId}")
    public ResponseEntity<DeckResponse> getDeck(@PathVariable Long personId,
                                                @PathVariable Long deckId) {
        return deckService.findById(deckId)
                .map(deck -> ResponseEntity.ok(DeckResponse.from(deck, getCardResponses(deckId))))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createDeck(@PathVariable Long personId,
                                        @RequestBody CreateDeckRequest body) {
        try {
            var deck = deckService.createDeck(personId, body.name(),
                    body.cardIds() != null ? body.cardIds() : List.of());
            return ResponseEntity.ok(DeckResponse.from(deck, getCardResponses(deck.getId())));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{deckId}/rename")
    public ResponseEntity<?> renameDeck(@PathVariable Long personId,
                                        @PathVariable Long deckId,
                                        @RequestBody Map<String, String> body) {
        try {
            String name = body.get("name");
            if (name == null || name.isBlank())
                return ResponseEntity.badRequest().body("El nombre es obligatorio");
            var deck = deckService.renameDeck(personId, deckId, name);
            return ResponseEntity.ok(DeckResponse.from(deck, getCardResponses(deckId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{deckId}/cards/{cardId}")
    public ResponseEntity<?> addCard(@PathVariable Long personId,
                                     @PathVariable Long deckId,
                                     @PathVariable Long cardId) {
        try {
            var dc = deckService.addCard(personId, deckId, cardId);
            return ResponseEntity.ok(DeckCardResponse.from(dc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

@PatchMapping("/{deckId}/cards/{deckCardId}/swap")
    public ResponseEntity<?> swapCard(@PathVariable Long personId,
                                      @PathVariable Long deckId,
                                      @PathVariable Long deckCardId,
                                      @RequestBody Map<String, Long> body) {
        try {
            Long newCardId = body.get("newCardId");
            if (newCardId == null)
                return ResponseEntity.badRequest().body("newCardId es obligatorio");
            var dc = deckService.swapCard(personId, deckId, deckCardId, newCardId);
            return ResponseEntity.ok(DeckCardResponse.from(dc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{deckId}/cards/{deckCardId}")
    public ResponseEntity<?> removeCard(@PathVariable Long personId,
                                        @PathVariable Long deckId,
                                        @PathVariable Long deckCardId) {
        try {
            deckService.removeCard(personId, deckId, deckCardId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{deckId}")
    public ResponseEntity<?> deleteDeck(@PathVariable Long personId,
                                        @PathVariable Long deckId) {
        try {
            deckService.deleteDeck(personId, deckId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
