package com.tfg.inazuma.service;

import com.tfg.inazuma.model.*;
import com.tfg.inazuma.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MissionService {

    private static final int XP_PER_LEVEL    = 200;
    private static final int XP_INCREMENT    = 100;
    private static final int POINTS_ON_LEVEL = 12;

    private final MissionRepository       missionRepository;
    private final PersonMissionRepository personMissionRepository;
    private final PersonRepository        personRepository;

public List<Mission> findAll() { return missionRepository.findAll(); }

    public Optional<Mission> findById(Long id) { return missionRepository.findById(id); }

    public Mission create(Mission mission) { return missionRepository.save(mission); }

    public boolean delete(Long id) {
        if (!missionRepository.existsById(id)) return false;
        missionRepository.deleteById(id);
        return true;
    }

@Transactional
    public void assignAllToNewPerson(Person person) {
        List<Mission> all = missionRepository.findAll();
        for (Mission mission : all) {
            PersonMission pm = new PersonMission();
            pm.setPerson(person);
            pm.setMission(mission);
            personMissionRepository.save(pm);
        }
    }

    public PersonMission assign(Long personId, Long missionId) {
        Person person  = findPersonOrThrow(personId);
        Mission mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new IllegalArgumentException("Misión no encontrada"));

        if (personMissionRepository.findByPersonAndMission(person, mission).isPresent())
            throw new IllegalArgumentException("El jugador ya tiene esta misión asignada");

        PersonMission pm = new PersonMission();
        pm.setPerson(person);
        pm.setMission(mission);
        return personMissionRepository.save(pm);
    }

    public List<PersonMission> getPersonMissions(Long personId) {
        return personMissionRepository.findByPerson(findPersonOrThrow(personId));
    }

@Transactional
    public void recordEvent(Person person, MissionType type) {
        personMissionRepository.incrementProgress(person, type);
    }

    @Transactional
    public void recordEvent(Long personId, MissionType type) {
        recordEvent(findPersonOrThrow(personId), type);
    }

@Transactional
    public PersonMission claim(Long personId, Long personMissionId) {
        PersonMission pm = personMissionRepository.findById(personMissionId)
                .orElseThrow(() -> new IllegalArgumentException("Entrada de misión no encontrada"));

        if (!pm.getPerson().getId().equals(personId))
            throw new IllegalArgumentException("La misión no pertenece a este jugador");
        if (pm.getProgress() < pm.getMission().getGoal())
            throw new IllegalArgumentException("La misión aún no está completada");
        if (pm.isClaimed())
            throw new IllegalArgumentException("Las recompensas ya han sido reclamadas");

        Mission mission = pm.getMission();
        grantRewards(pm.getPerson(), mission.getRewardExperience(), mission.getRewardPoints());
        pm.setClaimed(true);
        return personMissionRepository.save(pm);
    }

private void grantRewards(Person person, int xp, int points) {
        person.setPackPoints(person.getPackPoints() + points);
        person.setTotalExperience(person.getTotalExperience() + xp);

        int remaining = xp;
        while (remaining > 0) {
            int xpForNext = xpForNextLevel(person.getLevel());
            int gap       = xpForNext - person.getExperience();
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

    private int xpForNextLevel(int level) {
        return XP_PER_LEVEL + (level - 1) * XP_INCREMENT;
    }

    private Person findPersonOrThrow(Long id) {
        return personRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Persona no encontrada"));
    }
}
