package com.tfg.inazuma.service;

import com.tfg.inazuma.dto.MatchResponse;
import com.tfg.inazuma.dto.MatchStateResponse;
import com.tfg.inazuma.model.*;
import com.tfg.inazuma.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MatchServiceTest {

    @Mock MatchRepository     matchRepo;
    @Mock MatchRoundRepository roundRepo;
    @Mock MatchTurnRepository  turnRepo;
    @Mock PersonRepository    personRepo;
    @Mock DeckRepository      deckRepo;
    @Mock DeckCardRepository  deckCardRepo;
    @Mock MissionService      missionService;

    @InjectMocks
    MatchService matchService;

    private Person crearPersona(Long id, String nickname) {
        Person p = new Person();
        p.setId(id);
        p.setPlayerId("PLAY-" + id);
        p.setName("Player" + id);
        p.setSurname("Test");
        p.setNickname(nickname);
        p.setEmail("player" + id + "@test.com");
        p.setLevel(1);
        p.setExperience(0);
        p.setTotalExperience(0);
        p.setPackPoints(0);
        p.setAccumulatedPacks(0);
        return p;
    }

    private Match crearPartida(Long id, Person p1, Person p2, MatchStatus status) {
        Match m = new Match();
        m.setId(id);
        m.setPlayer1(p1);
        m.setPlayer2(p2);
        m.setStatus(status);
        m.setCreatedAt(LocalDateTime.now());
        m.setLastActivityPlayer1(LocalDateTime.now());
        m.setLastActivityPlayer2(LocalDateTime.now());
        m.setRoundsWonPlayer1(0);
        m.setRoundsWonPlayer2(0);
        m.setTurnsWonPlayer1LastRound(0);
        m.setTurnsWonPlayer2LastRound(0);
        m.setConsecutiveLegendPlayer1(0);
        m.setConsecutiveLegendPlayer2(0);
        m.setWonByAbandon(false);
        return m;
    }

    private Deck crearBaraja(Long id, Person person) {
        Deck d = new Deck();
        d.setId(id);
        d.setPerson(person);
        d.setName("Baraja " + id);
        return d;
    }

    private Card crearCarta(Long id, CardType type) {
        Card c = new Card();
        c.setId(id);
        c.setName("Carta " + id);
        c.setType(type);
        c.setCardPackage(CardPackage.INAZUMA_ELEVEN);
        c.setPosition(CardPosition.POR);
        c.setAttack(70);
        c.setControl(80);
        c.setDefense(90);
        return c;
    }

    private DeckCard crearDeckCard(Deck deck, Card card) {
        DeckCard dc = new DeckCard();
        dc.setDeck(deck);
        dc.setCard(card);
        return dc;
    }

    private MatchRound crearRonda(Long id, Match match) {
        MatchRound r = new MatchRound();
        r.setId(id);
        r.setMatch(match);
        r.setRoundNumber(1);
        r.setTurnsWonPlayer1(0);
        r.setTurnsWonPlayer2(0);
        r.setCompleted(false);
        return r;
    }

    private MatchTurn crearTurno(Long id, MatchRound round) {
        MatchTurn t = new MatchTurn();
        t.setId(id);
        t.setRound(round);
        t.setTurnNumber(1);
        t.setCreatedAt(LocalDateTime.now());
        t.setResult(TurnResult.PENDING);
        return t;
    }

    private void mockBuildStateConBarajasNulas(Long matchId, Match match) {
        when(matchRepo.findById(matchId)).thenReturn(Optional.of(match));
        when(roundRepo.findFirstByMatchAndCompletedFalse(any()))
                .thenReturn(Optional.empty());
    }

@Test
    @DisplayName("RF-45 | Caso positivo: ambos jugadores libres → invitación PENDING_INVITE creada")
    void invitePlayer_casoPositivo_invitacionCreada() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");

        when(personRepo.findById(1L)).thenReturn(Optional.of(p1));
        when(personRepo.findById(2L)).thenReturn(Optional.of(p2));
        when(matchRepo.findActiveForPerson(p1)).thenReturn(List.of());
        when(matchRepo.findActiveForPerson(p2)).thenReturn(List.of());
        when(matchRepo.save(any())).thenAnswer(inv -> {
            Match m = inv.getArgument(0);
            m.setId(20L);
            return m;
        });

        MatchResponse result = matchService.invitePlayer(1L, 2L);

        assertNotNull(result);
        assertEquals(MatchStatus.PENDING_INVITE, result.status());
    }

    @Test
    @DisplayName("RF-45 | Caso negativo: el iniciador ya tiene una partida activa → IllegalStateException")
    void invitePlayer_casoNegativo_iniciadorEnPartida() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match activa = crearPartida(10L, p1, p2, MatchStatus.IN_PROGRESS);

        when(personRepo.findById(1L)).thenReturn(Optional.of(p1));
        when(personRepo.findById(2L)).thenReturn(Optional.of(p2));
        when(matchRepo.findActiveForPerson(p1)).thenReturn(List.of(activa));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> matchService.invitePlayer(1L, 2L)
        );

        assertTrue(ex.getMessage().contains("Ya tienes una partida activa"));
    }

    @Test
    @DisplayName("RF-45 | Caso negativo: el receptor ya tiene una partida activa → IllegalStateException")
    void invitePlayer_casoNegativo_receptorEnPartida() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match activa = crearPartida(10L, p1, p2, MatchStatus.IN_PROGRESS);

        when(personRepo.findById(1L)).thenReturn(Optional.of(p1));
        when(personRepo.findById(2L)).thenReturn(Optional.of(p2));
        when(matchRepo.findActiveForPerson(p1)).thenReturn(List.of());
        when(matchRepo.findActiveForPerson(p2)).thenReturn(List.of(activa));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> matchService.invitePlayer(1L, 2L)
        );

        assertTrue(ex.getMessage().contains("ya tiene una partida activa"));
    }

@Test
    @DisplayName("RF-46 | Caso positivo: receptor acepta → partida pasa a WAITING_READY")
    void respondInvite_casoPositivo_aceptar() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.PENDING_INVITE);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(matchRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MatchResponse result = matchService.respondInvite(20L, 2L, true);

        assertNotNull(result);
        assertEquals(MatchStatus.WAITING_READY, result.status());
    }

    @Test
    @DisplayName("RF-46 | Caso positivo: receptor rechaza → partida pasa a REJECTED")
    void respondInvite_casoPositivo_rechazar() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.PENDING_INVITE);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(matchRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MatchResponse result = matchService.respondInvite(20L, 2L, false);

        assertNotNull(result);
        assertEquals(MatchStatus.REJECTED, result.status());
    }

    @Test
    @DisplayName("RF-46 | Caso negativo: un tercero intenta responder → IllegalArgumentException")
    void respondInvite_casoNegativo_noEsReceptor() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.PENDING_INVITE);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> matchService.respondInvite(20L, 99L, true)
        );

        assertTrue(ex.getMessage().contains("No eres el receptor de esta invitación"));
    }

@Test
    @DisplayName("RF-47 | Caso positivo: jugador 1 elige baraja válida → marcado como listo")
    void setReady_casoPositivo_unJugadorListo() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.WAITING_READY);
        Deck deck1 = crearBaraja(100L, p1);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(deckRepo.findById(100L)).thenReturn(Optional.of(deck1));
        when(deckCardRepo.countByDeck(deck1)).thenReturn(5);
        when(matchRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        when(roundRepo.findFirstByMatchAndCompletedFalse(any())).thenReturn(Optional.empty());
        when(turnRepo.findAllCompletedByMatch(any())).thenReturn(List.of());
        when(deckCardRepo.findByDeck(deck1)).thenReturn(List.of());

        MatchStateResponse result = matchService.setReady(20L, 1L, 100L);

        assertTrue(match.isPlayer1Ready());
        assertEquals(deck1, match.getDeck1());
        assertNotNull(result);
    }

    @Test
    @DisplayName("RF-47 | Caso negativo: baraja no tiene 5 cartas → IllegalArgumentException")
    void setReady_casoNegativo_barajaSinCincoCartas() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.WAITING_READY);
        Deck deck1 = crearBaraja(100L, p1);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(deckRepo.findById(100L)).thenReturn(Optional.of(deck1));
        when(deckCardRepo.countByDeck(deck1)).thenReturn(3);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> matchService.setReady(20L, 1L, 100L)
        );

        assertTrue(ex.getMessage().contains("La baraja debe tener exactamente 5 cartas"));
    }

    @Test
    @DisplayName("RF-47 | Caso negativo: baraja no pertenece al jugador → IllegalArgumentException")
    void setReady_casoNegativo_barajaNoPertenece() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.WAITING_READY);
        Deck barajaDeOtro = crearBaraja(100L, p2);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(deckRepo.findById(100L)).thenReturn(Optional.of(barajaDeOtro));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> matchService.setReady(20L, 1L, 100L)
        );

        assertTrue(ex.getMessage().contains("Esta baraja no te pertenece"));
    }

    @Test
    @DisplayName("RF-49 | Caso positivo: ambos jugadores listos → partida comienza (IN_PROGRESS)")
    void setReady_casoPositivo_ambosListosPartidaEmpieza() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.WAITING_READY);
        Deck deck1 = crearBaraja(100L, p1);
        Deck deck2 = crearBaraja(200L, p2);

        match.setDeck2(deck2);
        match.setPlayer2Ready(true);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(deckRepo.findById(100L)).thenReturn(Optional.of(deck1));
        when(deckCardRepo.countByDeck(deck1)).thenReturn(5);
        when(matchRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        when(roundRepo.save(any())).thenAnswer(inv -> {
            MatchRound r = inv.getArgument(0); r.setId(100L); return r;
        });
        when(turnRepo.findByRoundOrderByTurnNumberAsc(any())).thenReturn(List.of());
        when(turnRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        when(roundRepo.findFirstByMatchAndCompletedFalse(any())).thenReturn(Optional.empty());
        when(turnRepo.findAllCompletedByMatch(any())).thenReturn(List.of());
        when(deckCardRepo.findByDeck(any())).thenReturn(List.of());

        MatchStateResponse result = matchService.setReady(20L, 1L, 100L);

        assertEquals(MatchStatus.IN_PROGRESS, match.getStatus());
        assertNotNull(result);
    }

    @Test
    @DisplayName("RF-49 | Caso negativo: segundo jugador marca listo con baraja incompleta → partida no inicia")
    void setReady_casoNegativo_segundoJugadorBarajaIncompleta() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.WAITING_READY);
        Deck deck1 = crearBaraja(100L, p1);
        Deck deck2 = crearBaraja(200L, p2);

        match.setDeck1(deck1);
        match.setPlayer1Ready(true);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(deckRepo.findById(200L)).thenReturn(Optional.of(deck2));
        when(deckCardRepo.countByDeck(deck2)).thenReturn(3);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> matchService.setReady(20L, 2L, 200L)
        );

        assertTrue(ex.getMessage().contains("La baraja debe tener exactamente 5 cartas"));
        assertNotEquals(MatchStatus.IN_PROGRESS, match.getStatus());
    }

@Test
    @DisplayName("RF-50 | Caso positivo: jugador deshace listo → ready=false y baraja limpiada")
    void unsetReady_casoPositivo_deshacerListo() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.WAITING_READY);
        Deck deck1 = crearBaraja(100L, p1);
        match.setDeck1(deck1);
        match.setPlayer1Ready(true);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(matchRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        mockBuildStateConBarajasNulas(20L, match);

        MatchStateResponse result = matchService.unsetReady(20L, 1L);

        assertFalse(match.isPlayer1Ready());
        assertNull(match.getDeck1());
        assertNotNull(result);
    }

    @Test
    @DisplayName("RF-50 | Caso negativo: la partida no está en fase lobby → IllegalStateException")
    void unsetReady_casoNegativo_partidaNoEnLobby() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.IN_PROGRESS);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> matchService.unsetReady(20L, 1L)
        );

        assertTrue(ex.getMessage().contains("La partida no está en fase de lobby"));
    }

@Test
    @DisplayName("RF-51 | Caso positivo: jugador cancela en el lobby → partida CANCELLED")
    void cancelMatch_casoPositivo_cancelarLobby() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.WAITING_READY);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(matchRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MatchResponse result = matchService.cancelMatch(20L, 1L);

        assertNotNull(result);
        assertEquals(MatchStatus.CANCELLED, result.status());
    }

    @Test
    @DisplayName("RF-51 | Caso negativo: la partida ya está en curso → IllegalStateException")
    void cancelMatch_casoNegativo_partidaEnCurso() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.IN_PROGRESS);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> matchService.cancelMatch(20L, 1L)
        );

        assertTrue(ex.getMessage().contains("Solo se puede cancelar antes de empezar la partida"));
    }

@Test
    @DisplayName("RF-59 | Caso positivo: carta en baraja y atributo no usado → jugada registrada")
    void submitMove_casoPositivo_jugadaRegistrada() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.IN_PROGRESS);
        Deck deck1 = crearBaraja(100L, p1);
        match.setDeck1(deck1);
        Card carta = crearCarta(5L, CardType.NORMAL);
        DeckCard dc = crearDeckCard(deck1, carta);

        MatchRound round = crearRonda(50L, match);
        MatchTurn  turn  = crearTurno(300L, round);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(roundRepo.findFirstByMatchAndCompletedFalse(any())).thenReturn(Optional.of(round));
        when(turnRepo.findFirstByRoundAndResult(round, TurnResult.PENDING)).thenReturn(Optional.of(turn));
        when(deckCardRepo.findByDeck(deck1)).thenReturn(List.of(dc));
        when(turnRepo.findAllCompletedByMatch(match)).thenReturn(List.of());
        when(turnRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(matchRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(turnRepo.findByRoundOrderByTurnNumberAsc(round)).thenReturn(List.of(turn));
        when(roundRepo.findByMatchOrderByRoundNumberAsc(match)).thenReturn(List.of());

        MatchStateResponse result = matchService.submitMove(20L, 1L, 5L, CardAttribute.ATTACK);

        assertNotNull(result);
        assertEquals(carta, turn.getPlayer1Card());
        assertEquals(CardAttribute.ATTACK, turn.getPlayer1Attribute());
        assertNotNull(turn.getPlayer1SubmittedAt());
    }

    @Test
    @DisplayName("RF-59 | Caso negativo: carta no está en la baraja del jugador → IllegalArgumentException")
    void submitMove_casoNegativo_cartaNoEnBaraja() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.IN_PROGRESS);
        Deck deck1 = crearBaraja(100L, p1);
        match.setDeck1(deck1);

        MatchRound round = crearRonda(50L, match);
        MatchTurn turn  = crearTurno(300L, round);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(roundRepo.findFirstByMatchAndCompletedFalse(match)).thenReturn(Optional.of(round));
        when(turnRepo.findFirstByRoundAndResult(round, TurnResult.PENDING)).thenReturn(Optional.of(turn));
        when(deckCardRepo.findByDeck(deck1)).thenReturn(List.of());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> matchService.submitMove(20L, 1L, 999L, CardAttribute.ATTACK)
        );

        assertTrue(ex.getMessage().contains("La carta no está en tu baraja"));
    }

    @Test
    @DisplayName("RF-59 | Caso negativo: atributo ya usado para esa carta → IllegalArgumentException")
    void submitMove_casoNegativo_atributoYaUsado() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.IN_PROGRESS);
        Deck deck1 = crearBaraja(100L, p1);
        match.setDeck1(deck1);
        Card carta = crearCarta(5L, CardType.NORMAL);

        MatchRound round = crearRonda(50L, match);
        MatchTurn turn   = crearTurno(300L, round);

        MatchTurn completado = new MatchTurn();
        completado.setPlayer1Card(carta);
        completado.setPlayer1Attribute(CardAttribute.ATTACK);
        completado.setResult(TurnResult.PLAYER1_WINS);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(roundRepo.findFirstByMatchAndCompletedFalse(match)).thenReturn(Optional.of(round));
        when(turnRepo.findFirstByRoundAndResult(round, TurnResult.PENDING)).thenReturn(Optional.of(turn));
        when(deckCardRepo.findByDeck(deck1)).thenReturn(List.of(crearDeckCard(deck1, carta)));
        when(turnRepo.findAllCompletedByMatch(match)).thenReturn(List.of(completado));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> matchService.submitMove(20L, 1L, 5L, CardAttribute.ATTACK)
        );

        assertTrue(ex.getMessage().contains("Ya usaste ese atributo de esa carta"));
    }

    @Test
    @DisplayName("RF-59 | Caso negativo: Legend usada 3 veces consecutivas con alternativas disponibles → IllegalArgumentException")
    void submitMove_casoNegativo_legendConsecutivaBloqueda() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.IN_PROGRESS);
        match.setConsecutiveLegendPlayer1(2);

        Deck deck1 = crearBaraja(100L, p1);
        match.setDeck1(deck1);
        Card legend = crearCarta(6L, CardType.LEGEND);
        Card normal = crearCarta(7L, CardType.NORMAL);
        DeckCard dcLegend = crearDeckCard(deck1, legend);
        DeckCard dcNormal = crearDeckCard(deck1, normal);

        MatchRound round = crearRonda(50L, match);
        MatchTurn  turn  = crearTurno(300L, round);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(roundRepo.findFirstByMatchAndCompletedFalse(match)).thenReturn(Optional.of(round));
        when(turnRepo.findFirstByRoundAndResult(round, TurnResult.PENDING)).thenReturn(Optional.of(turn));
        when(deckCardRepo.findByDeck(deck1)).thenReturn(List.of(dcLegend, dcNormal));
        when(turnRepo.findAllCompletedByMatch(match)).thenReturn(List.of());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> matchService.submitMove(20L, 1L, 6L, CardAttribute.ATTACK)
        );

        assertTrue(ex.getMessage().contains("No puedes usar una carta Legend tres turnos consecutivos"));
    }

@Test
    @DisplayName("RF-62 | Caso positivo: jugador 1 abandona → jugador 2 gana, partida FINISHED")
    void forfeit_casoPositivo_jugadorAbandonaYRivalGana() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.IN_PROGRESS);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(matchRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(personRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        when(roundRepo.findFirstByMatchAndCompletedFalse(any())).thenReturn(Optional.empty());

        MatchStateResponse result = matchService.forfeit(20L, 1L);

        assertEquals(MatchStatus.FINISHED, match.getStatus());
        assertEquals(p2, match.getWinner());
        assertTrue(match.isWonByAbandon());
        assertNotNull(result);
    }

    @Test
    @DisplayName("RF-62 | Caso negativo: la partida no está en curso → IllegalStateException")
    void forfeit_casoNegativo_partidaNoEnCurso() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.FINISHED);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> matchService.forfeit(20L, 1L)
        );

        assertTrue(ex.getMessage().contains("La partida no está en curso"));
    }

@Test
    @DisplayName("RF-66 | Caso positivo: ambos jugadores quieren revancha → nueva partida WAITING_READY creada")
    void voteRematch_casoPositivo_ambosQuierenRevancha() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.FINISHED);
        match.setPlayer2WantsRematch(true);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(matchRepo.save(any(Match.class))).thenAnswer(inv -> {
            Match m = inv.getArgument(0);
            if (m.getId() == null) m.setId(21L);
            return m;
        });
        
        when(roundRepo.findFirstByMatchAndCompletedFalse(any())).thenReturn(Optional.empty());

        MatchStateResponse result = matchService.voteRematch(20L, 1L, true);

        assertTrue(match.isPlayer1WantsRematch());
        assertNotNull(match.getRematchMatchId());
        assertEquals(21L, match.getRematchMatchId());
        assertNotNull(result);
    }

    @Test
    @DisplayName("RF-66 | Caso negativo: la partida no ha terminado → IllegalStateException")
    void voteRematch_casoNegativo_confirmar_partidaNoTerminada() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.IN_PROGRESS);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> matchService.voteRematch(20L, 1L, true)
        );

        assertTrue(ex.getMessage().contains("La partida no ha terminado"));
    }

    @Test
    @DisplayName("RF-67 | Caso positivo: jugador rechaza la revancha → votos reseteados, sin nueva partida")
    void voteRematch_casoPositivo_rechazarRevancha() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.FINISHED);
        match.setPlayer2WantsRematch(true);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));
        when(matchRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        
        when(roundRepo.findFirstByMatchAndCompletedFalse(any())).thenReturn(Optional.empty());

        MatchStateResponse result = matchService.voteRematch(20L, 1L, false);

        assertFalse(match.isPlayer1WantsRematch());
        assertFalse(match.isPlayer2WantsRematch());
        assertNull(match.getRematchMatchId());
        assertNotNull(result);
    }

    @Test
    @DisplayName("RF-67 | Caso negativo: la partida no ha terminado → IllegalStateException")
    void voteRematch_casoNegativo_rechazar_partidaNoTerminada() {
        Person p1 = crearPersona(1L, "pedro");
        Person p2 = crearPersona(2L, "luis");
        Match match = crearPartida(20L, p1, p2, MatchStatus.IN_PROGRESS);

        when(matchRepo.findById(20L)).thenReturn(Optional.of(match));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> matchService.voteRematch(20L, 1L, false)
        );

        assertTrue(ex.getMessage().contains("La partida no ha terminado"));
    }
}
