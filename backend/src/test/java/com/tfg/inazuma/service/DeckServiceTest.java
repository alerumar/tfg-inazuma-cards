package com.tfg.inazuma.service;

import com.tfg.inazuma.model.*;
import com.tfg.inazuma.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeckServiceTest {

    @Mock DeckRepository       deckRepository;
    @Mock DeckCardRepository   deckCardRepository;
    @Mock PersonRepository     personRepository;
    @Mock CardRepository       cardRepository;
    @Mock PersonCardRepository personCardRepository;
    @Mock MatchRepository      matchRepository;

    @InjectMocks
    DeckService deckService;

    private Person crearPersona(Long id) {
        Person p = new Person();
        p.setId(id);
        p.setNickname("jugador" + id);
        return p;
    }

    private Card crearCarta(Long id, CardType type) {
        Card c = new Card();
        c.setId(id);
        c.setName("Carta " + id);
        c.setType(type);
        c.setCardPackage(CardPackage.INAZUMA_ELEVEN);
        c.setPosition(CardPosition.POR);
        return c;
    }

    private Deck crearBaraja(Long id, Person person) {
        Deck d = new Deck();
        d.setId(id);
        d.setPerson(person);
        d.setName("Mi baraja");
        return d;
    }

@Test
    @DisplayName("RF-36 | Caso positivo: nombre válido y no supera límite → baraja creada")
    void createDeck_casoPositivo_nombreValido() {
        Person person = crearPersona(1L);

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(deckRepository.countByPerson(person)).thenReturn(3);
        when(deckRepository.save(any())).thenAnswer(inv -> {
            Deck d = inv.getArgument(0);
            d.setId(10L);
            return d;
        });

        Deck result = deckService.createDeck(1L, "Equipo principal", List.of());

        assertNotNull(result);
        assertEquals("Equipo principal", result.getName());
    }

    @Test
    @DisplayName("RF-36 | Caso negativo: nombre en blanco → IllegalArgumentException")
    void createDeck_casoNegativo_nombreEnBlanco() {
        Person person = crearPersona(1L);

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> deckService.createDeck(1L, "   ", List.of())
        );

        assertTrue(ex.getMessage().contains("El nombre es obligatorio"));
    }

    @Test
    @DisplayName("RF-36 | Caso negativo: límite de barajas alcanzado → IllegalArgumentException")
    void createDeck_casoNegativo_limiteAlcanzado() {
        Person person = crearPersona(1L);

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(deckRepository.countByPerson(person)).thenReturn(10);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> deckService.createDeck(1L, "Nueva baraja", List.of())
        );

        assertTrue(ex.getMessage().contains("Límite de 10 barajas alcanzado"));
    }

@Test
    @DisplayName("RF-37 | Caso positivo: carta válida, en colección y no duplicada → añadida")
    void addCard_casoPositivo_cartaValida() {
        Person person = crearPersona(1L);
        Deck   deck   = crearBaraja(10L, person);
        Card   card   = crearCarta(5L, CardType.NORMAL);
        PersonCard pc = new PersonCard();
        pc.setPerson(person);
        pc.setCard(card);

        when(deckRepository.findById(10L)).thenReturn(Optional.of(deck));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(personCardRepository.findByPersonAndCard(person, card)).thenReturn(Optional.of(pc));
        when(deckCardRepository.countByDeckAndCardId(deck, 5L)).thenReturn(0);
        when(deckCardRepository.countByDeck(deck)).thenReturn(2);
        when(deckCardRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        DeckCard result = deckService.addCard(1L, 10L, 5L);

        assertNotNull(result);
        assertEquals(card, result.getCard());
    }

    @Test
    @DisplayName("RF-37 | Caso negativo: carta no está en la colección → IllegalArgumentException")
    void addCard_casoNegativo_cartaNoEnColeccion() {
        Person person = crearPersona(1L);
        Deck   deck   = crearBaraja(10L, person);
        Card   card   = crearCarta(5L, CardType.NORMAL);

        when(deckRepository.findById(10L)).thenReturn(Optional.of(deck));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(personCardRepository.findByPersonAndCard(person, card)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> deckService.addCard(1L, 10L, 5L)
        );

        assertTrue(ex.getMessage().contains("No tienes esta carta en tu colección"));
    }

    @Test
    @DisplayName("RF-37 | Caso negativo: carta ya presente en la baraja → IllegalArgumentException")
    void addCard_casoNegativo_cartaDuplicada() {
        Person person = crearPersona(1L);
        Deck   deck   = crearBaraja(10L, person);
        Card   card   = crearCarta(5L, CardType.NORMAL);
        PersonCard pc = new PersonCard();
        pc.setPerson(person);
        pc.setCard(card);

        when(deckRepository.findById(10L)).thenReturn(Optional.of(deck));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(personCardRepository.findByPersonAndCard(person, card)).thenReturn(Optional.of(pc));
        when(deckCardRepository.countByDeckAndCardId(deck, 5L)).thenReturn(1);
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> deckService.addCard(1L, 10L, 5L)
        );

        assertTrue(ex.getMessage().contains("ya está en esta baraja"));
    }

    @Test
    @DisplayName("RF-37 | Caso negativo: baraja ya tiene 5 cartas → IllegalArgumentException")
    void addCard_casoNegativo_barajaLlena() {
        Person person = crearPersona(1L);
        Deck   deck   = crearBaraja(10L, person);
        Card   card   = crearCarta(5L, CardType.NORMAL);
        PersonCard pc = new PersonCard();
        pc.setPerson(person);
        pc.setCard(card);

        when(deckRepository.findById(10L)).thenReturn(Optional.of(deck));
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(personCardRepository.findByPersonAndCard(person, card)).thenReturn(Optional.of(pc));
        when(deckCardRepository.countByDeckAndCardId(deck, 5L)).thenReturn(0);
        when(deckCardRepository.countByDeck(deck)).thenReturn(5);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> deckService.addCard(1L, 10L, 5L)
        );

        assertTrue(ex.getMessage().contains("La baraja ya tiene 5 cartas"));
    }

    @Test
    @DisplayName("RF-37 | Caso negativo: ya hay 2 cartas Legend en la baraja → IllegalArgumentException")
    void addCard_casoNegativo_maxLeyendasAlcanzado() {
        Person person = crearPersona(1L);
        Deck   deck   = crearBaraja(10L, person);
        Card   legend = crearCarta(6L, CardType.LEGEND);
        PersonCard pc = new PersonCard();
        pc.setPerson(person);
        pc.setCard(legend);

        when(deckRepository.findById(10L)).thenReturn(Optional.of(deck));
        when(cardRepository.findById(6L)).thenReturn(Optional.of(legend));
        when(personCardRepository.findByPersonAndCard(person, legend)).thenReturn(Optional.of(pc));
        when(deckCardRepository.countByDeckAndCardId(deck, 6L)).thenReturn(0);
        when(deckCardRepository.countByDeck(deck)).thenReturn(3);
        when(deckCardRepository.countLegendsByDeck(deck)).thenReturn(2);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> deckService.addCard(1L, 10L, 6L)
        );

        assertTrue(ex.getMessage().contains("La baraja ya tiene 2 cartas Legend"));
    }

@Test
    @DisplayName("RF-38 | Caso positivo: dueño elimina su baraja → baraja borrada")
    void deleteDeck_casoPositivo_propietarioEliminaBaraja() {
        Person person = crearPersona(1L);
        Deck   deck   = crearBaraja(10L, person);

        when(deckRepository.findById(10L)).thenReturn(Optional.of(deck));

        deckService.deleteDeck(1L, 10L);

        verify(deckCardRepository).deleteByDeck(deck);
        verify(deckRepository).delete(deck);
    }

    @Test
    @DisplayName("RF-38 | Caso negativo: la baraja pertenece a otro jugador → IllegalArgumentException")
    void deleteDeck_casoNegativo_noEsDuenyo() {
        Person otroPropietario = crearPersona(99L);
        Deck   deck            = crearBaraja(10L, otroPropietario);

        when(deckRepository.findById(10L)).thenReturn(Optional.of(deck));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> deckService.deleteDeck(1L, 10L)
        );

        assertTrue(ex.getMessage().contains("Esta baraja no te pertenece"));
    }

@Test
    @DisplayName("RF-35 | Caso positivo: jugador con barajas → listado devuelto correctamente")
    void getDecks_casoPositivo_listadoDevuelto() {
        Person person = crearPersona(1L);
        Deck d1 = crearBaraja(10L, person);
        Deck d2 = crearBaraja(11L, person);

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(deckRepository.findByPerson(person)).thenReturn(List.of(d1, d2));

        List<Deck> result = deckService.getDecks(1L);

        assertEquals(2, result.size());
    }

    @Test
    @DisplayName("RF-35 | Caso negativo: jugador inexistente → IllegalArgumentException")
    void getDecks_casoNegativo_jugadorNoExiste() {
        when(personRepository.findById(99L)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> deckService.getDecks(99L)
        );

        assertTrue(ex.getMessage().contains("Persona no encontrada"));
    }

}
