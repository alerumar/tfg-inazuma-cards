package com.tfg.inazuma.controller;

import com.tfg.inazuma.dto.*;
import com.tfg.inazuma.service.PersonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/api/persons")
@RequiredArgsConstructor
public class PersonController {

    private final PersonService personService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        try {
            var person = personService.register(req);
            URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                    .replacePath("/api/persons/{id}")
                    .buildAndExpand(person.getId()).toUri();
            return ResponseEntity.created(location).body(PersonResponse.from(person));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        return personService.login(req)
                .map(p -> ResponseEntity.ok(PersonResponse.from(p)))
                .orElse(ResponseEntity.status(401).build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PersonResponse> findById(@PathVariable Long id) {
        return personService.findById(id)
                .map(p -> ResponseEntity.ok(PersonResponse.from(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/player/{playerId}")
    public ResponseEntity<PersonResponse> findByPlayerId(@PathVariable String playerId) {
        return personService.findByPlayerId(playerId)
                .map(p -> ResponseEntity.ok(PersonResponse.from(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody UpdatePersonRequest req) {
        try {
            return personService.update(id, req)
                    .map(p -> ResponseEntity.ok(PersonResponse.from(p)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return personService.delete(id)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
