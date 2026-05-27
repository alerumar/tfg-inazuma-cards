package com.tfg.inazuma;

import com.tfg.inazuma.model.*;
import com.tfg.inazuma.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(3)
public class PersonSeeder implements CommandLineRunner {

    private static final String DEFAULT_PHOTO = "/images/default_profile.png";

    private final PersonRepository        personRepository;
    private final CardRepository          cardRepository;
    private final PersonCardRepository    personCardRepository;
    private final MissionRepository       missionRepository;
    private final PersonMissionRepository personMissionRepository;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final Random                random  = new Random();

    @Override
    public void run(String... args) {
        if (personRepository.count() > 0) {
            log.info("Persons already seeded, skipping.");
            return;
        }

        List<Card>    allCards    = cardRepository.findAll();
        List<Mission> allMissions = missionRepository.findAll();

        // ── Admin (todas las cartas; nivel inicial — sube reclamando misiones) ─
        Person admin = buildPerson("Admin", null, "admin",
                "admin@inazuma.com", "Admin123!", 1, 0, 0);
        personRepository.save(admin);

        List<PersonCard> adminCards = allCards.stream().map(card -> {
            PersonCard pc = new PersonCard();
            pc.setPerson(admin);
            pc.setCard(card);
            pc.setQuantity(1);
            return pc;
        }).toList();
        personCardRepository.saveAll(adminCards);

        // ── User1 y User2 (recién registrados, sin cartas) ────────────────────
        Person user1 = buildPerson("User1", null, "user1",
                "user1@inazuma.com", "User1123!", 1, 0, 0);
        Person user2 = buildPerson("User2", null, "user2",
                "user2@inazuma.com", "User2123!", 1, 0, 0);
        personRepository.saveAll(List.of(user1, user2));

        // ── PersonMissions para los tres usuarios ─────────────────────────────
        List<PersonMission> pms = new ArrayList<>();
        for (Person person : List.of(admin, user1, user2)) {
            for (Mission mission : allMissions) {
                PersonMission pm = new PersonMission();
                pm.setPerson(person);
                pm.setMission(mission);

                // Admin: misiones de colección de cartas con progreso al máximo
                if (person == admin && mission.getType() == MissionType.COLLECT_CARDS) {
                    pm.setProgress(Math.min(allCards.size(), mission.getGoal()));
                } else {
                    pm.setProgress(0);
                }
                pms.add(pm);
            }
        }
        personMissionRepository.saveAll(pms);

        log.info("Seeded 3 persons — admin ({} cartas), user1, user2.", allCards.size());
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Person buildPerson(String name, String surname, String nickname,
                                String email, String rawPassword,
                                int level, int experience, int totalExperience) {
        Person p = new Person();
        p.setPlayerId(uniquePlayerId());
        p.setName(name);
        p.setSurname(surname);
        p.setNickname(nickname);
        p.setEmail(email);
        p.setPasswordHash(encoder.encode(rawPassword));
        p.setProfilePhoto(DEFAULT_PHOTO);
        p.setLevel(level);
        p.setExperience(experience);
        p.setTotalExperience(totalExperience);
        p.setPackPoints(0);
        p.setAccumulatedPacks(0);
        return p;
    }

    /** Genera un playerId único: 6 letras minúsculas + 2 dígitos. */
    private String uniquePlayerId() {
        String letters = "abcdefghijklmnopqrstuvwxyz";
        String digits  = "0123456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 6; i++) sb.append(letters.charAt(random.nextInt(letters.length())));
        for (int i = 0; i < 2; i++) sb.append(digits.charAt(random.nextInt(digits.length())));
        String id = sb.toString();
        return personRepository.existsByPlayerId(id) ? uniquePlayerId() : id;
    }
}
