package com.tfg.inazuma.controller;

import com.tfg.inazuma.dto.ClaimRewardResponse;
import com.tfg.inazuma.dto.MissionResponse;
import com.tfg.inazuma.dto.PersonMissionResponse;
import com.tfg.inazuma.model.Mission;
import com.tfg.inazuma.service.MissionService;
import com.tfg.inazuma.service.PersonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class MissionController {

    private final MissionService missionService;
    private final PersonService  personService;

@GetMapping("/api/missions")
    public List<MissionResponse> findAll() {
        return missionService.findAll().stream().map(MissionResponse::from).toList();
    }

    @GetMapping("/api/missions/{id}")
    public ResponseEntity<MissionResponse> findById(@PathVariable Long id) {
        return missionService.findById(id)
                .map(m -> ResponseEntity.ok(MissionResponse.from(m)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/api/missions")
    public ResponseEntity<?> create(@Valid @RequestBody Mission mission) {
        return ResponseEntity.ok(MissionResponse.from(missionService.create(mission)));
    }

    @DeleteMapping("/api/missions/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return missionService.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }

@GetMapping("/api/persons/{personId}/missions")
    public List<PersonMissionResponse> getPersonMissions(@PathVariable Long personId) {
        return missionService.getPersonMissions(personId).stream()
                .map(PersonMissionResponse::from).toList();
    }

@PostMapping("/api/persons/{personId}/missions/{personMissionId}/claim")
    public ResponseEntity<?> claim(@PathVariable Long personId, @PathVariable Long personMissionId) {
        try {
            var pm = missionService.claim(personId, personMissionId);
            var person = personService.toResponse(pm.getPerson());
            return ResponseEntity.ok(new ClaimRewardResponse(PersonMissionResponse.from(pm), person));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/api/persons/{personId}/missions/{missionId}")
    public ResponseEntity<?> assign(@PathVariable Long personId, @PathVariable Long missionId) {
        try {
            return ResponseEntity.ok(PersonMissionResponse.from(
                    missionService.assign(personId, missionId)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
