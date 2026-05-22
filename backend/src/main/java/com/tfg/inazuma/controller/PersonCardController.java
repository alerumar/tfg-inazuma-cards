package com.tfg.inazuma.controller;

import com.tfg.inazuma.dto.PersonCardResponse;
import com.tfg.inazuma.service.PersonCardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/persons/{personId}/collection")
@RequiredArgsConstructor
public class PersonCardController {

    private final PersonCardService personCardService;

    @GetMapping
    public List<PersonCardResponse> getCollection(@PathVariable Long personId) {
        return personCardService.getCollection(personId).stream()
                .map(PersonCardResponse::from).toList();
    }

    @GetMapping("/duplicates")
    public List<PersonCardResponse> getDuplicates(@PathVariable Long personId) {
        return personCardService.getDuplicates(personId).stream()
                .map(PersonCardResponse::from).toList();
    }

    @GetMapping("/total")
    public Map<String, Integer> getTotal(@PathVariable Long personId) {
        return Map.of("total", personCardService.getTotalCards(personId));
    }

    @PostMapping("/{cardId}")
    public ResponseEntity<?> addCard(@PathVariable Long personId, @PathVariable Long cardId) {
        try {
            return ResponseEntity.ok(PersonCardResponse.from(personCardService.addCard(personId, cardId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{cardId}")
    public ResponseEntity<?> removeCard(@PathVariable Long personId, @PathVariable Long cardId) {
        try {
            personCardService.removeCard(personId, cardId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
