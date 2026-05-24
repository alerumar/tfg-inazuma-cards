package com.tfg.inazuma.controller;

import com.tfg.inazuma.dto.CardResponse;
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

    @GetMapping
    public List<DeckResponse> getDecks(@PathVariable Long personId) {
        return deckService.getDecks(personId).stream()
                .map(deck -> DeckResponse.from(deck,
                        deckService.getCards(deck.getId()).stream()
                                .map(dc -> CardResponse.from(dc.getCard())).toList()))
                .toList();
    }

    @GetMapping("/{deckId}")
    public ResponseEntity<DeckResponse> getDeck(@PathVariable Long personId,
                                                @PathVariable Long deckId) {
        return deckService.findById(deckId)
                .map(deck -> ResponseEntity.ok(DeckResponse.from(deck,
                        deckService.getCards(deckId).stream()
                                .map(dc -> CardResponse.from(dc.getCard())).toList())))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createDeck(@PathVariable Long personId,
                                        @RequestBody Map<String, String> body) {
        try {
            String name = body.get("name");
            if (name == null || name.isBlank())
                return ResponseEntity.badRequest().body("El nombre es obligatorio");
            var deck = deckService.createDeck(personId, name);
            return ResponseEntity.ok(DeckResponse.from(deck, List.of()));
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
            return ResponseEntity.ok(DeckResponse.from(deck,
                    deckService.getCards(deckId).stream()
                            .map(dc -> CardResponse.from(dc.getCard())).toList()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{deckId}/cards/{cardId}")
    public ResponseEntity<?> addCard(@PathVariable Long personId,
                                     @PathVariable Long deckId,
                                     @PathVariable Long cardId) {
        try {
            return ResponseEntity.ok(CardResponse.from(deckService.addCard(personId, deckId, cardId).getCard()));
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
