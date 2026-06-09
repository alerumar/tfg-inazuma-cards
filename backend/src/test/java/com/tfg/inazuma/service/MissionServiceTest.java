package com.tfg.inazuma.service;

import com.tfg.inazuma.model.*;
import com.tfg.inazuma.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MissionServiceTest {

    @Mock MissionRepository       missionRepository;
    @Mock PersonMissionRepository personMissionRepository;
    @Mock PersonRepository        personRepository;

    @InjectMocks
    MissionService missionService;

    private Person crearPersona(Long id) {
        Person p = new Person();
        p.setId(id);
        p.setLevel(1);
        p.setExperience(0);
        p.setTotalExperience(0);
        p.setPackPoints(0);
        return p;
    }

    private Mission crearMision(int goal, int xp, int points) {
        Mission m = new Mission();
        m.setId(1L);
        m.setName("Abre 10 sobres");
        m.setType(MissionType.OPEN_PACKS);
        m.setGoal(goal);
        m.setRewardExperience(xp);
        m.setRewardPoints(points);
        return m;
    }

    private PersonMission crearPersonMission(Person person, Mission mission,
                                              int progress, boolean claimed) {
        PersonMission pm = new PersonMission();
        pm.setId(1L);
        pm.setPerson(person);
        pm.setMission(mission);
        pm.setProgress(progress);
        pm.setClaimed(claimed);
        return pm;
    }

    // ═══════════════════════════════════════════════════════════
    //  RF-09 — Reclamar recompensa de misión
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("RF-09 | Caso positivo: misión completada y no reclamada → recompensas concedidas")
    void claim_casoPositivo_misionCompletada() {
        Person person   = crearPersona(1L);
        Mission mission = crearMision(10, 100, 5);
        PersonMission pm = crearPersonMission(person, mission, 10, false);

        when(personMissionRepository.findById(1L)).thenReturn(Optional.of(pm));
        when(personRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(personMissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PersonMission result = missionService.claim(1L, 1L);

        assertTrue(result.isClaimed());
        assertEquals(5, person.getPackPoints());
    }

    @Test
    @DisplayName("RF-09 | Caso negativo: misión no completada → IllegalArgumentException")
    void claim_casoNegativo_misionNoCompletada() {
        Person person   = crearPersona(1L);
        Mission mission = crearMision(10, 100, 5);
        PersonMission pm = crearPersonMission(person, mission, 5, false);

        when(personMissionRepository.findById(1L)).thenReturn(Optional.of(pm));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> missionService.claim(1L, 1L)
        );

        assertTrue(ex.getMessage().contains("aún no está completada"));
    }

    @Test
    @DisplayName("RF-09 | Caso negativo: recompensa ya reclamada → IllegalArgumentException")
    void claim_casoNegativo_yaReclamada() {
        Person person   = crearPersona(1L);
        Mission mission = crearMision(10, 100, 5);
        PersonMission pm = crearPersonMission(person, mission, 10, true);

        when(personMissionRepository.findById(1L)).thenReturn(Optional.of(pm));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> missionService.claim(1L, 1L)
        );

        assertTrue(ex.getMessage().contains("ya han sido reclamadas"));
    }

    @Test
    @DisplayName("RF-09 | Caso negativo: misión no pertenece al jugador → IllegalArgumentException")
    void claim_casoNegativo_misionDeOtroJugador() {
        Person otraPersoa = crearPersona(99L);
        Mission mission   = crearMision(10, 100, 5);
        PersonMission pm  = crearPersonMission(otraPersoa, mission, 10, false);

        when(personMissionRepository.findById(1L)).thenReturn(Optional.of(pm));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> missionService.claim(1L, 1L) 
        );

        assertTrue(ex.getMessage().contains("no pertenece a este jugador"));
    }
}
