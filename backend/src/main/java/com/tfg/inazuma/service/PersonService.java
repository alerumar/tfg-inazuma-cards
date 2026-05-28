package com.tfg.inazuma.service;

import com.tfg.inazuma.dto.ChangePasswordRequest;
import com.tfg.inazuma.dto.LoginRequest;
import com.tfg.inazuma.dto.PersonResponse;
import com.tfg.inazuma.dto.RegisterRequest;
import com.tfg.inazuma.dto.UpdatePersonRequest;
import com.tfg.inazuma.model.FriendshipStatus;
import com.tfg.inazuma.model.Person;
import com.tfg.inazuma.repository.FriendshipRepository;
import com.tfg.inazuma.repository.PersonCardRepository;
import com.tfg.inazuma.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class PersonService {

    private final PersonRepository        personRepository;
    private final PersonCardRepository    personCardRepository;
    private final FriendshipRepository    friendshipRepository;
    private final MissionService          missionService;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final Random random = new Random();

    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Construye un PersonResponse calculando cardCount y friendCount */
    public PersonResponse toResponse(Person p) {
        int cardCount   = Optional.ofNullable(personCardRepository.sumQuantityByPerson(p)).orElse(0);
        int friendCount = (int) friendshipRepository.countByPersonAndStatus(p, FriendshipStatus.ACCEPTED);
        return PersonResponse.from(p, cardCount, friendCount);
    }

    // ── CRUD ───────────────────────────────────────────────────────────────────

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
        // El usuario empieza con los 3 sobres gratuitos ya disponibles.
        // lastPackDate queda null; el timer arrancará cuando abra el primer sobre.
        person.setAccumulatedPacks(3);
        Person saved = personRepository.save(person);

        // Asignar todas las misiones existentes al nuevo usuario
        missionService.assignAllToNewPerson(saved);

        return saved;
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
            if (req.name() != null && !req.name().isBlank())
                person.setName(req.name());

            if (req.surname() != null)
                person.setSurname(req.surname());

            if (req.nickname() != null && !req.nickname().isBlank()) {
                if (!req.nickname().equals(person.getNickname())
                        && personRepository.existsByNickname(req.nickname()))
                    throw new IllegalArgumentException("Nickname ya en uso");
                person.setNickname(req.nickname());
            }

            if (req.email() != null && !req.email().isBlank()) {
                if (!req.email().equals(person.getEmail())
                        && personRepository.existsByEmail(req.email()))
                    throw new IllegalArgumentException("Email ya en uso");
                person.setEmail(req.email());
            }

            if (req.profilePhoto() != null)
                person.setProfilePhoto(req.profilePhoto());

            return personRepository.save(person);
        });
    }

    public void changePassword(Long id, ChangePasswordRequest req) {
        Person person = personRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        if (!passwordEncoder.matches(req.currentPassword(), person.getPasswordHash()))
            throw new IllegalArgumentException("La contraseña actual no es correcta");
        if (req.newPassword().length() < 6)
            throw new IllegalArgumentException("La nueva contraseña debe tener al menos 6 caracteres");
        person.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        personRepository.save(person);
    }

    public boolean delete(Long id) {
        if (!personRepository.existsById(id)) return false;
        personRepository.deleteById(id);
        return true;
    }

    public Optional<Person> updatePhoto(Long id, MultipartFile file) throws IOException {
        return personRepository.findById(id).map(person -> {
            try {
                // Nombre fijo por usuario → sobreescribe la foto anterior sin acumular archivos
                String ext      = getExtension(file.getOriginalFilename());
                String filename = "profile_" + id + ext;
                Path dir        = Path.of("static/images/profiles/");
                Files.createDirectories(dir);
                Files.write(dir.resolve(filename), file.getBytes());
                // Añadimos ?v=timestamp a la URL para que el cliente no use la caché antigua
                person.setProfilePhoto("/images/profiles/" + filename + "?v=" + System.currentTimeMillis());
                return personRepository.save(person);
            } catch (IOException e) {
                throw new RuntimeException("Error al guardar la foto", e);
            }
        });
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private String generateUniquePlayerId() {
        String id;
        do { id = generatePlayerId(); }
        while (personRepository.existsByPlayerId(id));
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

    private String getExtension(String filename) {
        if (filename == null) return ".jpg";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : ".jpg";
    }
}
