package com.tfg.inazuma.service;

import com.tfg.inazuma.dto.PackOpenResult;
import com.tfg.inazuma.model.*;
import com.tfg.inazuma.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PackServiceTest {

    @Mock PersonRepository     personRepository;
    @Mock CardRepository       cardRepository;
    @Mock PersonCardRepository personCardRepository;
    @Mock MissionService       missionService;

    @InjectMocks
    PackService packService;

    private LocalDate currentRewardDay() {
        LocalDateTime now = LocalDateTime.now();
        return now.toLocalTime().isBefore(LocalTime.of(9, 0))
                ? now.toLocalDate().minusDays(1)
                : now.toLocalDate();
    }

    private Person crearPersona(int sobres, int puntos) {
        Person p = new Person();
        p.setId(1L);
        p.setAccumulatedPacks(sobres);
        p.setPackPoints(puntos);
        p.setLevel(1);
        p.setExperience(0);
        p.setTotalExperience(0);
        return p;
    }

    private Card crearCartaNormal() {
        Card c = new Card();
        c.setId(1L);
        c.setName("Endou Mamoru");
        c.setCardPackage(CardPackage.INAZUMA_ELEVEN);
        c.setType(CardType.NORMAL);
        c.setPosition(CardPosition.POR);
        c.setAttack(70);
        c.setControl(85);
        c.setDefense(90);
        return c;
    }

    // ═══════════════════════════════════════════════════════════
    //  RF-04 — Abrir sobre gratuito
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("RF-04 | Caso positivo: tiene sobres acumulados → devuelve 5 cartas")
    void openFreePack_casoPositivo_conSobresAcumulados() {
        Person person = crearPersona(2, 0);
        person.setLastPackDate(LocalDateTime.now().minusHours(7));
        Card card = crearCartaNormal();

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(cardRepository.findAll(any(Sort.class))).thenReturn(
                List.of(card, card, card, card, card)
        );
        when(personCardRepository.existsByPersonAndCard(any(), any())).thenReturn(false);
        when(personCardRepository.findByPersonAndCard(any(), any())).thenReturn(Optional.empty());
        when(personRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PackOpenResult result = packService.openFreePack(1L, CardPackage.INAZUMA_ELEVEN);

        assertNotNull(result);
        assertEquals(5, result.cards().size());
    }

    @Test
    @DisplayName("RF-04 | Caso negativo: sin sobres acumulados → IllegalStateException")
    void openFreePack_casoNegativo_sinSobresAcumulados() {
        Person person = crearPersona(0, 0);
        person.setLastPackDate(LocalDateTime.now());

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> packService.openFreePack(1L, CardPackage.INAZUMA_ELEVEN)
        );

        assertTrue(ex.getMessage().contains("No tienes sobres disponibles"));
    }

    // ═══════════════════════════════════════════════════════════
    //  RF-05 — Abrir sobre con puntos
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("RF-05 | Caso positivo: sin sobres gratis y con puntos suficientes → devuelve 5 cartas")
    void openWithPoints_casoPositivo_puntossuficientes() {
        Person person = crearPersona(0, 20);
        person.setLastPackDate(LocalDateTime.now().minusMinutes(30));
        Card card = crearCartaNormal();

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(cardRepository.findAll(any(Sort.class))).thenReturn(
                List.of(card, card, card, card, card)
        );
        when(personCardRepository.existsByPersonAndCard(any(), any())).thenReturn(false);
        when(personCardRepository.findByPersonAndCard(any(), any())).thenReturn(Optional.empty());
        when(personRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PackOpenResult result = packService.openWithPoints(1L, CardPackage.INAZUMA_ELEVEN);

        assertNotNull(result);
        assertEquals(5, result.cards().size());
    }

    @Test
    @DisplayName("RF-05 | Caso negativo: tiene sobres gratis disponibles → IllegalStateException")
    void openWithPoints_casoNegativo_tieneSobresGratis() {
        Person person = crearPersona(1, 20);

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> packService.openWithPoints(1L, CardPackage.INAZUMA_ELEVEN)
        );

        assertTrue(ex.getMessage().contains("Tienes sobres gratis disponibles"));
    }

    @Test
    @DisplayName("RF-05 | Caso negativo: puntos insuficientes → IllegalStateException")
    void openWithPoints_casoNegativo_puntosInsuficientes() {
        Person person = crearPersona(0, 0);
        person.setLastPackDate(LocalDateTime.now().minusMinutes(30));

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> packService.openWithPoints(1L, CardPackage.INAZUMA_ELEVEN)
        );

        assertTrue(ex.getMessage().contains("No tienes suficientes puntos"));
    }

    // ═══════════════════════════════════════════════════════════
    //  RF-08 — Reclamar recompensa diaria
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("RF-08 | Caso positivo: recompensa no reclamada → devuelve 6 puntos")
    void claimDailyReward_casoPositivo_noReclamada() {
        Person person = crearPersona(1, 0);
        person.setLastDailyReward(currentRewardDay().minusDays(2));

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(personRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        int points = packService.claimDailyReward(1L);

        assertEquals(6, points);
    }

    @Test
    @DisplayName("RF-08 | Caso negativo: recompensa ya reclamada hoy → IllegalStateException")
    void claimDailyReward_casoNegativo_yaReclamada() {
        Person person = crearPersona(1, 0);
        person.setLastDailyReward(currentRewardDay());

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> packService.claimDailyReward(1L)
        );

        assertTrue(ex.getMessage().contains("Ya reclamaste el regalo de hoy"));
    }
}
