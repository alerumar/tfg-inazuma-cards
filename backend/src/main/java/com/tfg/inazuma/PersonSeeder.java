package com.tfg.inazuma;

import com.tfg.inazuma.model.*;
import com.tfg.inazuma.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(3)
public class PersonSeeder implements CommandLineRunner {

    private static final String DEFAULT_PHOTO = "/images/default_profile.png";

private static final int TOTAL_CARDS    = 150;
    private static final int DUPLICATE_EXTRA = 40;

    private final PersonRepository        personRepository;
    private final CardRepository          cardRepository;
    private final PersonCardRepository    personCardRepository;
    private final MissionRepository       missionRepository;
    private final PersonMissionRepository personMissionRepository;

    private final Random random = new Random();

    @Override
    public void run(String... args) {
        if (personRepository.count() > 0) {
            log.info("Persons already seeded, skipping.");
            return;
        }

        List<Card>    allCards    = cardRepository.findAll();
        List<Mission> allMissions = missionRepository.findAll();

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

        Person user1 = buildPerson("User1", null, "user1",
                "user1@inazuma.com", "User1123!", 1, 0, 0, 3);
        Person user2 = buildPerson("User2", null, "user2",
                "user2@inazuma.com", "User2123!", 1, 0, 0, 3);
        personRepository.saveAll(List.of(user1, user2));

        int user1UniqueCards = saveRandomCards(user1, allCards);
        int user2UniqueCards = saveRandomCards(user2, allCards);

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

private int saveRandomCards(Person person, List<Card> allCards) {
        List<PersonCard> cards = buildRandomCards(person, allCards);
        personCardRepository.saveAll(cards);
        return cards.size();
    }

    private List<PersonCard> buildRandomCards(Person person, List<Card> allCards) {
        int uniqueNeeded  = Math.min(TOTAL_CARDS - DUPLICATE_EXTRA, allCards.size());
        int extraNeeded   = Math.min(DUPLICATE_EXTRA, uniqueNeeded);

        List<Card> shuffled = new ArrayList<>(allCards);
        Collections.shuffle(shuffled, random);

        List<Card> chosen  = shuffled.subList(0, uniqueNeeded);
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
        p.setPassword(rawPassword);
        p.setProfilePhoto(DEFAULT_PHOTO);
        p.setLevel(level);
        p.setExperience(experience);
        p.setTotalExperience(totalExperience);
        p.setPackPoints(0);
        p.setAccumulatedPacks(accumulatedPacks);
        return p;
    }

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
