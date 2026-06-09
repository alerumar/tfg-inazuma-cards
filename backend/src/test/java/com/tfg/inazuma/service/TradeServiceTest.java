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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TradeServiceTest {

    @Mock TradeRepository      tradeRepository;
    @Mock PersonRepository     personRepository;
    @Mock CardRepository       cardRepository;
    @Mock PersonCardRepository personCardRepository;
    @Mock FriendshipRepository friendshipRepository;
    @Mock MissionService       missionService;
    @Mock NotificationService  notificationService;

    @InjectMocks
    TradeService tradeService;

    // ── Helpers ────────────────────────────────────────────────

    private Person crearPersona(Long id, String nickname) {
        Person p = new Person();
        p.setId(id);
        p.setNickname(nickname);
        return p;
    }

    private Card crearCarta(Long id, CardType type, String nombre) {
        Card c = new Card();
        c.setId(id);
        c.setName(nombre);
        c.setType(type);
        c.setCardPackage(CardPackage.INAZUMA_ELEVEN);
        c.setPosition(CardPosition.POR);
        return c;
    }

    private PersonCard crearPersonCard(Person person, Card card, int cantidad) {
        PersonCard pc = new PersonCard();
        pc.setPerson(person);
        pc.setCard(card);
        pc.setQuantity(cantidad);
        return pc;
    }

    private Trade crearTrade(Long id, Person initiator, Person receiver,
                              Card initiatorCard, Card receiverCard, TradeStatus status) {
        Trade t = new Trade();
        t.setId(id);
        t.setInitiator(initiator);
        t.setReceiver(receiver);
        t.setInitiatorCard(initiatorCard);
        t.setReceiverCard(receiverCard);
        t.setStatus(status);
        return t;
    }

    // ═══════════════════════════════════════════════════════════
    //  RF-22/23 — Proponer intercambio
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("RF-22 | Caso positivo: amigos, carta repetida → intercambio PENDING_RESPONSE creado")
    void propose_casoPositivo_amigosCartaRepetida() {
        Person initiator = crearPersona(1L, "pedroGarcia");
        Person receiver  = crearPersona(2L, "luisRuiz");
        Card   card      = crearCarta(5L, CardType.NORMAL, "Endou Mamoru");
        PersonCard pc    = crearPersonCard(initiator, card, 2); // tiene 2 copias

        Friendship amistad = new Friendship();
        amistad.setRequester(initiator);
        amistad.setReceiver(receiver);
        amistad.setStatus(FriendshipStatus.ACCEPTED);

        when(personRepository.findById(1L)).thenReturn(Optional.of(initiator));
        when(personRepository.findById(2L)).thenReturn(Optional.of(receiver));
        when(friendshipRepository.findBetween(initiator, receiver)).thenReturn(Optional.of(amistad));
        when(tradeRepository.findActiveByPerson(eq(initiator), any())).thenReturn(List.of());
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(personCardRepository.findByPersonAndCard(initiator, card)).thenReturn(Optional.of(pc));
        when(tradeRepository.save(any())).thenAnswer(inv -> {
            Trade t = inv.getArgument(0);
            t.setId(20L);
            return t;
        });

        Trade result = tradeService.propose(1L, 2L, 5L);

        assertNotNull(result);
        assertEquals(TradeStatus.PENDING_RESPONSE, result.getStatus());
        assertEquals(card, result.getInitiatorCard());
    }

    @Test
    @DisplayName("RF-22 | Caso negativo: no son amigos → IllegalArgumentException")
    void propose_casoNegativo_noSonAmigos() {
        Person initiator = crearPersona(1L, "pedroGarcia");
        Person receiver  = crearPersona(2L, "luisRuiz");

        when(personRepository.findById(1L)).thenReturn(Optional.of(initiator));
        when(personRepository.findById(2L)).thenReturn(Optional.of(receiver));
        when(friendshipRepository.findBetween(initiator, receiver)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> tradeService.propose(1L, 2L, 5L)
        );

        assertTrue(ex.getMessage().contains("Solo puedes intercambiar con amigos"));
    }

    @Test
    @DisplayName("RF-23 | Caso negativo: el jugador solo tiene 1 copia de la carta → IllegalArgumentException")
    void propose_casoNegativo_cartaNoRepetida() {
        Person initiator = crearPersona(1L, "pedroGarcia");
        Person receiver  = crearPersona(2L, "luisRuiz");
        Card   card      = crearCarta(5L, CardType.NORMAL, "Endou Mamoru");
        PersonCard pc    = crearPersonCard(initiator, card, 1); // solo 1 copia

        Friendship amistad = new Friendship();
        amistad.setRequester(initiator);
        amistad.setReceiver(receiver);
        amistad.setStatus(FriendshipStatus.ACCEPTED);

        when(personRepository.findById(1L)).thenReturn(Optional.of(initiator));
        when(personRepository.findById(2L)).thenReturn(Optional.of(receiver));
        when(friendshipRepository.findBetween(initiator, receiver)).thenReturn(Optional.of(amistad));
        when(tradeRepository.findActiveByPerson(eq(initiator), any())).thenReturn(List.of());
        when(cardRepository.findById(5L)).thenReturn(Optional.of(card));
        when(personCardRepository.findByPersonAndCard(initiator, card)).thenReturn(Optional.of(pc));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> tradeService.propose(1L, 2L, 5L)
        );

        assertTrue(ex.getMessage().contains("Solo puedes ofrecer cartas que tengas repetidas"));
    }

    // ═══════════════════════════════════════════════════════════
    //  RF-24/25 — Responder propuesta (receptor)
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("RF-24 | Caso positivo: receptor ofrece carta del mismo tipo → intercambio PENDING_CONFIRMATION")
    void receiverRespond_casoPositivo_ofreceCarta() {
        Person initiator  = crearPersona(1L, "pedroGarcia");
        Person receiver   = crearPersona(2L, "luisRuiz");
        Card   cartaA     = crearCarta(5L, CardType.NORMAL, "Endou Mamoru");
        Card   cartaB     = crearCarta(6L, CardType.NORMAL, "Gouenji Shuuya");
        PersonCard pcB    = crearPersonCard(receiver, cartaB, 2);
        Trade  trade      = crearTrade(20L, initiator, receiver, cartaA, null,
                                       TradeStatus.PENDING_RESPONSE);

        when(tradeRepository.findById(20L)).thenReturn(Optional.of(trade));
        when(cardRepository.findById(6L)).thenReturn(Optional.of(cartaB));
        when(personRepository.findById(2L)).thenReturn(Optional.of(receiver));
        when(personCardRepository.findByPersonAndCard(receiver, cartaB)).thenReturn(Optional.of(pcB));
        when(tradeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Trade result = tradeService.receiverRespond(20L, 2L, 6L);

        assertEquals(TradeStatus.PENDING_CONFIRMATION, result.getStatus());
        assertEquals(cartaB, result.getReceiverCard());
    }

    @Test
    @DisplayName("RF-24 | Caso negativo: carta ofrecida es de tipo diferente → IllegalArgumentException")
    void receiverRespond_casoNegativo_tipoDistinto() {
        Person initiator = crearPersona(1L, "pedroGarcia");
        Person receiver  = crearPersona(2L, "luisRuiz");
        Card   cartaA    = crearCarta(5L, CardType.NORMAL, "Endou Mamoru");
        Card   cartaB    = crearCarta(6L, CardType.LEGEND, "Inazuma X");
        Trade  trade     = crearTrade(20L, initiator, receiver, cartaA, null,
                                      TradeStatus.PENDING_RESPONSE);

        when(tradeRepository.findById(20L)).thenReturn(Optional.of(trade));
        when(cardRepository.findById(6L)).thenReturn(Optional.of(cartaB));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> tradeService.receiverRespond(20L, 2L, 6L)
        );

        assertTrue(ex.getMessage().contains("La carta ofrecida debe ser del mismo tipo"));
    }

    @Test
    @DisplayName("RF-25 | Caso positivo: receptor rechaza (cardId=null) → intercambio REJECTED_BY_RECEIVER")
    void receiverRespond_casoPositivo_rechazo() {
        Person initiator = crearPersona(1L, "pedroGarcia");
        Person receiver  = crearPersona(2L, "luisRuiz");
        Card   cartaA    = crearCarta(5L, CardType.NORMAL, "Endou Mamoru");
        Trade  trade     = crearTrade(20L, initiator, receiver, cartaA, null,
                                      TradeStatus.PENDING_RESPONSE);

        when(tradeRepository.findById(20L)).thenReturn(Optional.of(trade));
        when(tradeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Trade result = tradeService.receiverRespond(20L, 2L, null);

        assertEquals(TradeStatus.REJECTED_BY_RECEIVER, result.getStatus());
    }

    // ═══════════════════════════════════════════════════════════
    //  RF-26/27 — Confirmar o cancelar intercambio (iniciador)
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("RF-26 | Caso positivo: iniciador acepta → intercambio COMPLETED y cartas intercambiadas")
    void initiatorConfirm_casoPositivo_aceptar() {
        Person initiator  = crearPersona(1L, "pedroGarcia");
        Person receiver   = crearPersona(2L, "luisRuiz");
        Card   cartaA     = crearCarta(5L, CardType.NORMAL, "Endou Mamoru");
        Card   cartaB     = crearCarta(6L, CardType.NORMAL, "Gouenji Shuuya");
        PersonCard pcIA   = crearPersonCard(initiator, cartaA, 2);
        PersonCard pcRB   = crearPersonCard(receiver,  cartaB, 2);
        Trade  trade      = crearTrade(20L, initiator, receiver, cartaA, cartaB,
                                       TradeStatus.PENDING_CONFIRMATION);

        when(tradeRepository.findById(20L))
                .thenReturn(Optional.of(trade));
        when(personCardRepository.findByPersonAndCard(initiator, cartaA))
                .thenReturn(Optional.of(pcIA));
        when(personCardRepository.findByPersonAndCard(initiator, cartaB))
                .thenReturn(Optional.empty());
        when(personCardRepository.findByPersonAndCard(receiver, cartaB))
                .thenReturn(Optional.of(pcRB));
        when(personCardRepository.findByPersonAndCard(receiver, cartaA))
                .thenReturn(Optional.empty());

        when(personCardRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(tradeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Trade result = tradeService.initiatorConfirm(20L, 1L, true);

        assertEquals(TradeStatus.COMPLETED, result.getStatus());
        verify(missionService).recordEvent(initiator, MissionType.COMPLETE_TRADES);
        verify(missionService).recordEvent(receiver, MissionType.COMPLETE_TRADES);
    }

    @Test
    @DisplayName("RF-27 | Caso positivo: iniciador rechaza la oferta → intercambio REJECTED_BY_INITIATOR")
    void initiatorConfirm_casoPositivo_rechazar() {
        Person initiator = crearPersona(1L, "pedroGarcia");
        Person receiver  = crearPersona(2L, "luisRuiz");
        Card   cartaA    = crearCarta(5L, CardType.NORMAL, "Endou Mamoru");
        Card   cartaB    = crearCarta(6L, CardType.NORMAL, "Gouenji Shuuya");
        Trade  trade     = crearTrade(20L, initiator, receiver, cartaA, cartaB,
                                      TradeStatus.PENDING_CONFIRMATION);

        when(tradeRepository.findById(20L)).thenReturn(Optional.of(trade));
        when(tradeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Trade result = tradeService.initiatorConfirm(20L, 1L, false);

        assertEquals(TradeStatus.REJECTED_BY_INITIATOR, result.getStatus());
        verify(missionService, never()).recordEvent(any(Person.class), any(MissionType.class));
    }
}
