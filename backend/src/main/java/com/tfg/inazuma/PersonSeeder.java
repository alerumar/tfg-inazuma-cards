package com.tfg.inazuma;

import com.tfg.inazuma.model.*;
import com.tfg.inazuma.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(3)
public class PersonSeeder implements CommandLineRunner {

    private static final String DEFAULT_PHOTO = "/images/default_profile.png";

    /**
     * Número total de cartas (sumando cantidades) que se asignan a user1 y user2.
     * Se reparten así: UNIQUE_CARDS cartas distintas × 1, y DUPLICATE_EXTRA de ellas
     * reciben una copia extra → UNIQUE_CARDS + DUPLICATE_EXTRA = TOTAL_CARDS.
     */
    private static final int TOTAL_CARDS    = 150;
    private static final int DUPLICATE_EXTRA = 40;   // 40 cartas tendrán cantidad 2

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

        // ── Admin (todas las cartas) ───────────────────────────────────────────
        Person admin = buildPerson("Admin", null, "admin",
                "admin@inazuma.com", "Admin123!", 1, 0, 0, 0);
        personRepository.save(admin);

        List<PersonCard> adminCards = allCards.stream().map(card -> {
            PersonCard pc = new PersonCard();
            pc.setPerson(admin);
            pc.setCard(card);
            pc.setQuantity(1);
            return pc;
        }).toList();
        personCardRepository.saveAll(adminCards);

        // ── User1 y User2 — 150 cartas aleatorias, 40 duplicadas, 3 sobres ────
        Person user1 = buildPerson("User1", null, "user1",
                "user1@inazuma.com", "User1123!", 1, 0, 0, 3);
        Person user2 = buildPerson("User2", null, "user2",
                "user2@inazuma.com", "User2123!", 1, 0, 0, 3);
        personRepository.saveAll(List.of(user1, user2));

        // Guarda las cartas y obtén cuántas únicas se asignaron a cada usuario
        int user1UniqueCards = saveRandomCards(user1, allCards);
        int user2UniqueCards = saveRandomCards(user2, allCards);

        // ── PersonMissions ────────────────────────────────────────────────────
        // Para COLLECT_CARDS el progreso = número de cartas únicas que ya posee el usuario
        int adminUniqueCards = allCards.size();

        List<PersonMission> pms = new ArrayList<>();
        for (Mission mission : allMissions) {
            pms.add(buildMission(admin, mission,
                    mission.getType() == MissionType.COLLECT_CARDS
                            ? Math.min(adminUniqueCards, mission.getGoal()) : 0));
            pms.add(buildMission(user1, mission,
                    mission.getType() == MissionType.COLLECT_CARDS
                            ? Math.min(user1UniqueCards, mission.getGoal()) : 0));
            pms.add(buildMission(user2, mission,
                    mission.getType() == MissionType.COLLECT_CARDS
                            ? Math.min(user2UniqueCards, mission.getGoal()) : 0));
        }
        personMissionRepository.saveAll(pms);

        log.info("Seeded 3 persons — admin ({} cartas), user1 ({} cartas), user2 ({} cartas).",
                allCards.size(), TOTAL_CARDS, TOTAL_CARDS);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Genera TOTAL_CARDS cartas aleatorias para la persona dada:
     * - Elige aleatoriamente (TOTAL_CARDS - DUPLICATE_EXTRA) cartas únicas con cantidad 1.
     * - De ellas, DUPLICATE_EXTRA reciben una copia extra (cantidad 2).
     * - Total de copias = (TOTAL_CARDS - DUPLICATE_EXTRA) + DUPLICATE_EXTRA = TOTAL_CARDS.
     * Ajusta automáticamente si el catálogo tiene menos cartas de lo esperado.
     */
    /** Guarda cartas aleatorias para la persona y devuelve el número de cartas únicas asignadas. */
    private int saveRandomCards(Person person, List<Card> allCards) {
        List<PersonCard> cards = buildRandomCards(person, allCards);
        personCardRepository.saveAll(cards);
        return cards.size(); // cada entrada es una carta única
    }

    private List<PersonCard> buildRandomCards(Person person, List<Card> allCards) {
        // Garantiza que no pedimos más cartas únicas de las que existen
        int uniqueNeeded  = Math.min(TOTAL_CARDS - DUPLICATE_EXTRA, allCards.size());
        int extraNeeded   = Math.min(DUPLICATE_EXTRA, uniqueNeeded);

        List<Card> shuffled = new ArrayList<>(allCards);
        Collections.shuffle(shuffled, random);

        // Las 'uniqueNeeded' primeras van con cantidad 1
        List<Card> chosen  = shuffled.subList(0, uniqueNeeded);
        // Las 'extraNeeded' primeras de esas recibirán una copia extra
        Set<Long>  withTwo = new HashSet<>();
        for (int i = 0; i < extraNeeded; i++) {
            withTwo.add(chosen.get(i).getId());
        }

        List<PersonCard> result = new ArrayList<>();
        for (Card card : chosen) {
            PersonCard pc = new PersonCard();
            pc.setPerson(person);
            pc.setCard(card);
            pc.setQuantity(withTwo.contains(card.getId()) ? 2 : 1);
            result.add(pc);
        }
        return result;
    }

    private PersonMission buildMission(Person person, Mission mission, int progress) {
        PersonMission pm = new PersonMission();
        pm.setPerson(person);
        pm.setMission(mission);
        pm.setProgress(progress);
        return pm;
    }

    private Person buildPerson(String name, String surname, String nickname,
                                String email, String rawPassword,
                                int level, int experience, int totalExperience,
                                int accumulatedPacks) {
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
        p.setAccumulatedPacks(accumulatedPacks);
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
