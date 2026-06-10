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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FriendshipServiceTest {

    @Mock FriendshipRepository friendshipRepository;
    @Mock PersonRepository     personRepository;
    @Mock MatchRepository      matchRepository;
    @Mock MissionService       missionService;
    @Mock NotificationService  notificationService;

    @InjectMocks
    FriendshipService friendshipService;

    private Person crearPersona(Long id, String playerId, String nickname) {
        Person p = new Person();
        p.setId(id);
        p.setPlayerId(playerId);
        p.setNickname(nickname);
        return p;
    }

    private Friendship crearAmistad(Long id, Person requester, Person receiver,
                                    FriendshipStatus status) {
        Friendship f = new Friendship();
        f.setId(id);
        f.setRequester(requester);
        f.setReceiver(receiver);
        f.setStatus(status);
        return f;
    }

@Test
    @DisplayName("RF-21 | Caso positivo: solicitud válida entre dos jugadores distintos → amistad PENDING")
    void sendRequest_casoPositivo_solicitudValida() {
        Person requester = crearPersona(1L, "aaaaaa11", "pedroGarcia");
        Person receiver  = crearPersona(2L, "bbbbbb22", "luisRuiz");

        when(personRepository.findById(1L)).thenReturn(Optional.of(requester));
        when(personRepository.findByPlayerId("bbbbbb22")).thenReturn(Optional.of(receiver));
        when(friendshipRepository.findBetween(requester, receiver)).thenReturn(Optional.empty());
        when(friendshipRepository.save(any())).thenAnswer(inv -> {
            Friendship f = inv.getArgument(0);
            f.setId(10L);
            return f;
        });

        Friendship result = friendshipService.sendRequest(1L, "bbbbbb22");

        assertNotNull(result);
        assertEquals(FriendshipStatus.PENDING, result.getStatus());
        assertEquals(requester, result.getRequester());
        assertEquals(receiver, result.getReceiver());
    }

    @Test
    @DisplayName("RF-21 | Caso negativo: jugador se envía solicitud a sí mismo → IllegalArgumentException")
    void sendRequest_casoNegativo_mismaPersoa() {
        Person persona = crearPersona(1L, "aaaaaa11", "pedroGarcia");

        when(personRepository.findById(1L)).thenReturn(Optional.of(persona));
        when(personRepository.findByPlayerId("aaaaaa11")).thenReturn(Optional.of(persona));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> friendshipService.sendRequest(1L, "aaaaaa11")
        );

        assertTrue(ex.getMessage().contains("No puedes enviarte una solicitud a ti mismo"));
    }

    @Test
    @DisplayName("RF-21 | Caso negativo: ya existe una relación de amistad → IllegalArgumentException")
    void sendRequest_casoNegativo_relacionExistente() {
        Person requester = crearPersona(1L, "aaaaaa11", "pedroGarcia");
        Person receiver  = crearPersona(2L, "bbbbbb22", "luisRuiz");
        Friendship existing = crearAmistad(5L, requester, receiver, FriendshipStatus.ACCEPTED);

        when(personRepository.findById(1L)).thenReturn(Optional.of(requester));
        when(personRepository.findByPlayerId("bbbbbb22")).thenReturn(Optional.of(receiver));
        when(friendshipRepository.findBetween(requester, receiver)).thenReturn(Optional.of(existing));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> friendshipService.sendRequest(1L, "bbbbbb22")
        );

        assertTrue(ex.getMessage().contains("Ya existe una relación de amistad"));
    }

@Test
    @DisplayName("RF-17 | Caso positivo: receptor acepta la solicitud → estado ACCEPTED")
    void accept_casoPositivo_receptorAcepta() {
        Person requester = crearPersona(1L, "aaaaaa11", "pedroGarcia");
        Person receiver  = crearPersona(2L, "bbbbbb22", "luisRuiz");
        Friendship friendship = crearAmistad(10L, requester, receiver, FriendshipStatus.PENDING);

        when(friendshipRepository.findById(10L)).thenReturn(Optional.of(friendship));
        when(friendshipRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Friendship result = friendshipService.accept(10L, 2L);

        assertEquals(FriendshipStatus.ACCEPTED, result.getStatus());
        verify(missionService).recordEvent(requester, MissionType.ADD_FRIENDS);
        verify(missionService).recordEvent(receiver, MissionType.ADD_FRIENDS);
    }

    @Test
    @DisplayName("RF-17 | Caso negativo: un tercero intenta aceptar la solicitud → IllegalArgumentException")
    void accept_casoNegativo_noEsReceptor() {
        Person requester = crearPersona(1L, "aaaaaa11", "pedroGarcia");
        Person receiver  = crearPersona(2L, "bbbbbb22", "luisRuiz");
        Friendship friendship = crearAmistad(10L, requester, receiver, FriendshipStatus.PENDING);

        when(friendshipRepository.findById(10L)).thenReturn(Optional.of(friendship));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> friendshipService.accept(10L, 99L)
        );

        assertTrue(ex.getMessage().contains("No eres el destinatario de esta solicitud"));
    }

    @Test
    @DisplayName("RF-17 | Caso positivo: receptor rechaza la solicitud → amistad eliminada")
    void reject_casoPositivo_receptorRechaza() {
        Person requester = crearPersona(1L, "aaaaaa11", "pedroGarcia");
        Person receiver  = crearPersona(2L, "bbbbbb22", "luisRuiz");
        Friendship friendship = crearAmistad(10L, requester, receiver, FriendshipStatus.PENDING);

        when(friendshipRepository.findById(10L)).thenReturn(Optional.of(friendship));

        friendshipService.reject(10L, 2L);

        verify(friendshipRepository).delete(friendship);
    }

@Test
    @DisplayName("RF-19 | Caso positivo: solicitante cancela su solicitud pendiente → solicitud eliminada")
    void cancelSentRequest_casoPositivo_cancelaSolicitudPendiente() {
        Person requester = crearPersona(1L, "aaaaaa11", "pedroGarcia");
        Person receiver  = crearPersona(2L, "bbbbbb22", "luisRuiz");
        Friendship friendship = crearAmistad(10L, requester, receiver, FriendshipStatus.PENDING);

        when(friendshipRepository.findById(10L)).thenReturn(Optional.of(friendship));

        friendshipService.removeFriend(1L, 10L);

        verify(friendshipRepository).delete(friendship);
    }

    @Test
    @DisplayName("RF-19 | Caso negativo: jugador ajeno intenta cancelar la solicitud → IllegalArgumentException")
    void cancelSentRequest_casoNegativo_noEsElSolicitante() {
        Person requester = crearPersona(1L, "aaaaaa11", "pedroGarcia");
        Person receiver  = crearPersona(2L, "bbbbbb22", "luisRuiz");
        Friendship friendship = crearAmistad(10L, requester, receiver, FriendshipStatus.PENDING);

        when(friendshipRepository.findById(10L)).thenReturn(Optional.of(friendship));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> friendshipService.removeFriend(99L, 10L)
        );

        assertTrue(ex.getMessage().contains("No perteneces a esta amistad"));
    }
}
