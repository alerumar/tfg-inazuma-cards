package com.tfg.inazuma.controller;

import com.tfg.inazuma.dto.TradeResponse;
import com.tfg.inazuma.service.TradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;

    @PostMapping
    public ResponseEntity<?> propose(@RequestBody Map<String, Long> body) {
        try {
            Long initiatorId = body.get("initiatorId");
            Long receiverId  = body.get("receiverId");
            Long cardId      = body.get("cardId");
            if (initiatorId == null || receiverId == null || cardId == null)
                return ResponseEntity.badRequest().body("initiatorId, receiverId y cardId son obligatorios");
            return ResponseEntity.ok(TradeResponse.from(tradeService.propose(initiatorId, receiverId, cardId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<TradeResponse> findById(@PathVariable Long id) {
        return tradeService.findById(id)
                .map(t -> ResponseEntity.ok(TradeResponse.from(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/respond")
    public ResponseEntity<?> receiverRespond(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        try {
            Long receiverId     = body.get("receiverId");
            Long receiverCardId = body.get("receiverCardId");
            if (receiverId == null)
                return ResponseEntity.badRequest().body("receiverId es obligatorio");
            return ResponseEntity.ok(TradeResponse.from(tradeService.receiverRespond(id, receiverId, receiverCardId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<?> initiatorCancel(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        try {
            Long initiatorId = body.get("initiatorId");
            if (initiatorId == null)
                return ResponseEntity.badRequest().body("initiatorId es obligatorio");
            return ResponseEntity.ok(TradeResponse.from(tradeService.initiatorCancel(id, initiatorId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<?> initiatorConfirm(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            Long initiatorId = Long.valueOf(body.get("initiatorId").toString());
            boolean accept   = Boolean.parseBoolean(body.get("accept").toString());
            return ResponseEntity.ok(TradeResponse.from(tradeService.initiatorConfirm(id, initiatorId, accept)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/active-participant-ids")
    public List<Long> getActiveParticipantIds() {
        return tradeService.getActiveParticipantIds();
    }

    @GetMapping("/persons/{personId}/history")
    public List<TradeResponse> getHistory(@PathVariable Long personId) {
        return tradeService.getHistory(personId).stream().map(TradeResponse::from).toList();
    }

    @GetMapping("/persons/{personId}/active")
    public List<TradeResponse> getActive(@PathVariable Long personId) {
        return tradeService.getActive(personId).stream().map(TradeResponse::from).toList();
    }
}
