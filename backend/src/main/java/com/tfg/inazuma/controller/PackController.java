package com.tfg.inazuma.controller;

import com.tfg.inazuma.model.CardPackage;
import com.tfg.inazuma.service.PackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/persons/{personId}/packs")
@RequiredArgsConstructor
public class PackController {

    private final PackService packService;

    @GetMapping("/status")
    public ResponseEntity<?> getStatus(@PathVariable Long personId) {
        try {
            return ResponseEntity.ok(packService.getStatus(personId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/open/free")
    public ResponseEntity<?> openFree(@PathVariable Long personId,
                                      @RequestBody Map<String, String> body) {
        try {
            CardPackage type = parseType(body.get("type"));
            return ResponseEntity.ok(packService.openFreePack(personId, type));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/open/points")
    public ResponseEntity<?> openWithPoints(@PathVariable Long personId,
                                            @RequestBody Map<String, String> body) {
        try {
            CardPackage type = parseType(body.get("type"));
            return ResponseEntity.ok(packService.openWithPoints(personId, type));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/daily")
    public ResponseEntity<?> claimDaily(@PathVariable Long personId) {
        try {
            int points = packService.claimDailyReward(personId);
            return ResponseEntity.ok(Map.of("pointsGranted", points));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private CardPackage parseType(String type) {
        if (type == null) throw new IllegalArgumentException("El tipo de sobre es obligatorio (INAZUMA_ELEVEN o INAZUMA_ELEVEN_GO)");
        return switch (type.toUpperCase()) {
            case "INAZUMA_ELEVEN"     -> CardPackage.INAZUMA_ELEVEN;
            case "INAZUMA_ELEVEN_GO"  -> CardPackage.INAZUMA_ELEVEN_GO;
            default -> throw new IllegalArgumentException("Tipo de sobre inválido");
        };
    }
}
