package com.tfg.inazuma.service;

import com.tfg.inazuma.dto.LoginRequest;
import com.tfg.inazuma.dto.RegisterRequest;
import com.tfg.inazuma.dto.UpdatePersonRequest;
import com.tfg.inazuma.model.Person;
import com.tfg.inazuma.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class PersonService {

    private final PersonRepository personRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final Random random = new Random();

    public Person register(RegisterRequest req) {
        if (personRepository.existsByEmail(req.email()))
            throw new IllegalArgumentException("Email ya registrado");
        if (personRepository.existsByNickname(req.nickname()))
            throw new IllegalArgumentException("Nickname ya en uso");

        Person person = new Person();
        person.setPlayerId(generateUniquePlayerId());
        person.setName(req.name());
        person.setSurname(req.surname());
        person.setNickname(req.nickname());
        person.setEmail(req.email());
        person.setPasswordHash(passwordEncoder.encode(req.password()));
        return personRepository.save(person);
    }

    public Optional<Person> login(LoginRequest req) {
        return personRepository.findByNickname(req.nickname())
                .filter(p -> passwordEncoder.matches(req.password(), p.getPasswordHash()));
    }

    public Optional<Person> findById(Long id) {
        return personRepository.findById(id);
    }

    public Optional<Person> findByPlayerId(String playerId) {
        return personRepository.findByPlayerId(playerId);
    }

    public Optional<Person> update(Long id, UpdatePersonRequest req) {
        return personRepository.findById(id).map(person -> {
            if (req.name() != null && !req.name().isBlank()) person.setName(req.name());
            if (req.surname() != null) person.setSurname(req.surname());
            if (req.nickname() != null && !req.nickname().isBlank()) {
                if (!req.nickname().equals(person.getNickname()) && personRepository.existsByNickname(req.nickname()))
                    throw new IllegalArgumentException("Nickname ya en uso");
                person.setNickname(req.nickname());
            }
            if (req.profilePhoto() != null) person.setProfilePhoto(req.profilePhoto());
            return personRepository.save(person);
        });
    }

    public boolean delete(Long id) {
        if (!personRepository.existsById(id)) return false;
        personRepository.deleteById(id);
        return true;
    }

    private String generateUniquePlayerId() {
        String id;
        do {
            id = generatePlayerId();
        } while (personRepository.existsByPlayerId(id));
        return id;
    }

    private String generatePlayerId() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 6; i++)
            sb.append((char) ('a' + random.nextInt(26)));
        sb.append(random.nextInt(10));
        sb.append(random.nextInt(10));
        return sb.toString();
    }
}
