package com.tfg.inazuma.service;

import com.tfg.inazuma.dto.PackOpenResult;
import com.tfg.inazuma.dto.PackOpenResult.PackCardResult;
import com.tfg.inazuma.model.*;
import com.tfg.inazuma.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class PackService {

    private static final int    PACK_CARDS          = 5;
    private static final int    MAX_ACCUMULATED     = 3;
    private static final int    HOURS_PER_PACK      = 6;
    private static final int    POINTS_FULL_PACK    = 12;
    private static final int    DAILY_REWARD_POINTS = 6;
    private static final int    XP_PER_PACK         = 10;

    private static final int XP_PER_LEVEL  = 200;
    private static final int XP_INCREMENT  = 100;
    private static final int POINTS_ON_LEVEL = 12;

    private final PersonRepository     personRepository;
    private final CardRepository       cardRepository;
    private final PersonCardRepository personCardRepository;
    private final MissionService       missionService;
    private final Random               random = new Random();

    public record PackStatus(
            int accumulatedPacks,
            int packPoints,
            long minutesUntilNextPack,
            int pointsCostNow,
            boolean dailyRewardAvailable,
            long minutesUntilDailyReset
    ) {}

    @Transactional
    public PackOpenResult openFreePack(Long personId, CardPackage type) {
        Person person = findPersonOrThrow(personId);
        syncAccumulatedPacks(person);

        if (person.getAccumulatedPacks() <= 0)
            throw new IllegalStateException("No tienes sobres disponibles");

        boolean wasAtMax = person.getAccumulatedPacks() >= MAX_ACCUMULATED;
        person.setAccumulatedPacks(person.getAccumulatedPacks() - 1);
        if (wasAtMax) {
            person.setLastPackDate(LocalDateTime.now());
        }

        personRepository.save(person);
        return doOpenPack(person, type);
    }

    @Transactional
    public PackOpenResult openWithPoints(Long personId, CardPackage type) {
        Person person = findPersonOrThrow(personId);
        syncAccumulatedPacks(person);

        if (person.getAccumulatedPacks() > 0)
            throw new IllegalStateException("Tienes sobres gratis disponibles, úsalos primero");

        int cost = pointsCost(person);
        if (person.getPackPoints() < cost)
            throw new IllegalStateException("No tienes suficientes puntos (necesitas " + cost + ")");
        long remaining = minutesUntilNextPack(person);
        long minutesBought = (long) cost * 30;
        long overpay = minutesBought - remaining;
        person.setPackPoints(person.getPackPoints() - cost);
        person.setLastPackDate(LocalDateTime.now().minusMinutes(overpay));
        personRepository.save(person);

        return doOpenPack(person, type);
    }

    @Transactional
    public int claimDailyReward(Long personId) {
        Person person = findPersonOrThrow(personId);
        LocalDate rewardDay = currentRewardDay();

        if (rewardDay.equals(person.getLastDailyReward()))
            throw new IllegalStateException("Ya reclamaste el regalo de hoy");

        person.setPackPoints(person.getPackPoints() + DAILY_REWARD_POINTS);
        person.setLastDailyReward(rewardDay);
        personRepository.save(person);
        return DAILY_REWARD_POINTS;
    }

    public PackStatus getStatus(Long personId) {
        Person person = findPersonOrThrow(personId);
        syncAccumulatedPacks(person);
        personRepository.save(person);

        long minutesUntilNext  = minutesUntilNextPack(person);
        int  cost              = person.getAccumulatedPacks() > 0 ? 0 : pointsCost(person);
        boolean dailyAvailable = !currentRewardDay().equals(person.getLastDailyReward());
        long minutesDailyReset = minutesUntilDailyReset(person);

        return new PackStatus(
                person.getAccumulatedPacks(),
                person.getPackPoints(),
                minutesUntilNext,
                cost,
                dailyAvailable,
                minutesDailyReset
        );
    }

    private PackOpenResult doOpenPack(Person person, CardPackage type) {
        List<Card> normals = cardRepository.findAll(Sort.unsorted()).stream()
                .filter(c -> c.getCardPackage() == type && c.getType() == CardType.NORMAL)
                .toList();
        List<Card> legends = cardRepository.findAll(Sort.unsorted()).stream()
                .filter(c -> c.getCardPackage() == type && c.getType() == CardType.LEGEND)
                .toList();

        int legendCount = rollLegendCount();
        int normalCount = PACK_CARDS - legendCount;

        List<Card> drawn = new ArrayList<>();
        drawn.addAll(drawRandom(normals, normalCount));
        drawn.addAll(drawRandom(legends, legendCount));
        Collections.shuffle(drawn, random);

        List<PackCardResult> results = drawn.stream()
                .map(card -> {
                    boolean isNew = !personCardRepository.existsByPersonAndCard(person, card);
                    addOneCard(person, card);
                    return new PackCardResult(com.tfg.inazuma.dto.CardResponse.from(card), isNew);
                }).toList();

        grantExperience(person, XP_PER_PACK);

        missionService.recordEvent(person, MissionType.OPEN_PACKS);
        missionService.recordEvent(person, MissionType.COLLECT_CARDS);

        long newLegends = results.stream().filter(r -> r.card().type() == CardType.LEGEND && r.isNew()).count();
        if (newLegends > 0) missionService.recordEvent(person, MissionType.COLLECT_LEGENDS);

        return new PackOpenResult(results);
    }

    private int rollLegendCount() {
        double roll = random.nextDouble() * 100;
        if (roll < 0.5)  return 5;
        if (roll < 3.0)  return 2;
        if (roll < 8.0)  return 1;
        return 0;
    }

    private List<Card> drawRandom(List<Card> pool, int count) {
        if (pool.isEmpty() || count == 0) return List.of();
        List<Card> result = new ArrayList<>();
        for (int i = 0; i < count; i++)
            result.add(pool.get(random.nextInt(pool.size())));
        return result;
    }

    private void addOneCard(Person person, Card card) {
        personCardRepository.findByPersonAndCard(person, card).ifPresentOrElse(
                pc -> { pc.setQuantity(pc.getQuantity() + 1); personCardRepository.save(pc); },
                () -> { PersonCard pc = new PersonCard(); pc.setPerson(person); pc.setCard(card); personCardRepository.save(pc); }
        );
    }

    private void syncAccumulatedPacks(Person person) {
        if (person.getAccumulatedPacks() >= MAX_ACCUMULATED) return;
        if (person.getLastPackDate() == null) {
            person.setLastPackDate(LocalDateTime.now());
            return;
        }

        long minutesPassed = ChronoUnit.MINUTES.between(person.getLastPackDate(), LocalDateTime.now());
        int newPacks = (int) (minutesPassed / (HOURS_PER_PACK * 60));
        if (newPacks <= 0) return;

        int total = Math.min(person.getAccumulatedPacks() + newPacks, MAX_ACCUMULATED);
        person.setAccumulatedPacks(total);
        if (total < MAX_ACCUMULATED)
            person.setLastPackDate(person.getLastPackDate().plusMinutes((long) newPacks * HOURS_PER_PACK * 60));
    }

    private long minutesUntilNextPack(Person person) {
        if (person.getAccumulatedPacks() >= MAX_ACCUMULATED) return 0;
        if (person.getLastPackDate() == null) return 0;
        long elapsed = ChronoUnit.MINUTES.between(person.getLastPackDate(), LocalDateTime.now());
        long remaining = (HOURS_PER_PACK * 60) - (elapsed % (HOURS_PER_PACK * 60));
        return Math.max(0, remaining);
    }

    private int pointsCost(Person person) {
        long minutes = minutesUntilNextPack(person);
        int cost = (int) Math.ceil(minutes / 30.0);
        return Math.max(1, Math.min(cost, POINTS_FULL_PACK));
    }

    private LocalDate currentRewardDay() {
        LocalDateTime now = LocalDateTime.now();
        return now.toLocalTime().isBefore(LocalTime.of(9, 0))
                ? now.toLocalDate().minusDays(1)
                : now.toLocalDate();
    }

    private long minutesUntilDailyReset(Person person) {
        if (!currentRewardDay().equals(person.getLastDailyReward())) return 0;
        LocalDateTime nextReset = currentRewardDay().plusDays(1).atTime(LocalTime.of(9, 0));
        return Math.max(0, ChronoUnit.MINUTES.between(LocalDateTime.now(), nextReset));
    }

    private void grantExperience(Person person, int xp) {
        person.setTotalExperience(person.getTotalExperience() + xp);
        int remaining = xp;
        while (remaining > 0) {
            int xpForNext = XP_PER_LEVEL + (person.getLevel() - 1) * XP_INCREMENT;
            int gap = xpForNext - person.getExperience();
            if (remaining >= gap) {
                remaining -= gap;
                person.setLevel(person.getLevel() + 1);
                person.setExperience(0);
                person.setPackPoints(person.getPackPoints() + POINTS_ON_LEVEL);
            } else {
                person.setExperience(person.getExperience() + remaining);
                remaining = 0;
            }
        }
        personRepository.save(person);
    }

    private Person findPersonOrThrow(Long id) {
        return personRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Persona no encontrada"));
    }
}
