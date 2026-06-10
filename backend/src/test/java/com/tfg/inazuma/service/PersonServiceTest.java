package com.tfg.inazuma.service;

import com.tfg.inazuma.dto.ChangePasswordRequest;
import com.tfg.inazuma.dto.LoginRequest;
import com.tfg.inazuma.dto.RegisterRequest;
import com.tfg.inazuma.dto.UpdatePersonRequest;
import com.tfg.inazuma.model.Person;
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
class PersonServiceTest {

    @Mock PersonRepository        personRepository;
    @Mock PersonCardRepository    personCardRepository;
    @Mock FriendshipRepository    friendshipRepository;
    @Mock NotificationRepository  notificationRepository;
    @Mock TradeRepository         tradeRepository;
    @Mock PersonMissionRepository personMissionRepository;
    @Mock DeckCardRepository      deckCardRepository;
    @Mock DeckRepository          deckRepository;
    @Mock MatchTurnRepository     matchTurnRepository;
    @Mock MatchRoundRepository    matchRoundRepository;
    @Mock MatchRepository         matchRepository;
    @Mock MissionService          missionService;
    @Mock CardRepository          cardRepository;

    @InjectMocks
    PersonService personService;

    // ═══════════════════════════════════════════════════════════
    //  RF-01 — Crear cuenta
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("RF-01 | Caso positivo: datos válidos → persona registrada con 3 sobres iniciales")
    void register_casoPositivo_datosValidos() {
        RegisterRequest req = new RegisterRequest(
                "Pedro", "García", "pedro99", "pedro@email.com", "password123"
        );

        when(personRepository.existsByEmail("pedro@email.com")).thenReturn(false);
        when(personRepository.existsByNickname("pedro99")).thenReturn(false);
        when(personRepository.save(any())).thenAnswer(inv -> {
            Person p = inv.getArgument(0);
            p.setId(1L);
            return p;
        });

        Person result = personService.register(req);

        assertNotNull(result);
        assertEquals("pedro99", result.getNickname());
        assertEquals("pedro@email.com", result.getEmail());
        assertEquals(3, result.getAccumulatedPacks());
    }

    @Test
    @DisplayName("RF-01 | Caso negativo: email ya registrado → IllegalArgumentException")
    void register_casoNegativo_emailDuplicado() {
        RegisterRequest req = new RegisterRequest(
                "Pedro", "García", "pedro99", "pedro@email.com", "password123"
        );

        when(personRepository.existsByEmail("pedro@email.com")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> personService.register(req)
        );

        assertTrue(ex.getMessage().contains("Email ya registrado"));
    }

    @Test
    @DisplayName("RF-01 | Caso negativo: nickname ya en uso → IllegalArgumentException")
    void register_casoNegativo_nicknameDuplicado() {
        RegisterRequest req = new RegisterRequest(
                "Pedro", "García", "pedro99", "pedro@email.com", "password123"
        );

        when(personRepository.existsByEmail(any())).thenReturn(false);
        when(personRepository.existsByNickname("pedro99")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> personService.register(req)
        );

        assertTrue(ex.getMessage().contains("Nickname ya en uso"));
    }

    // ═══════════════════════════════════════════════════════════
    //  RF-02 — Iniciar sesión
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("RF-02 | Caso positivo: credenciales correctas → persona devuelta")
    void login_casoPositivo_credencialesCorrectas() {
        LoginRequest req = new LoginRequest("pedro99", "password123");

        Person mockPerson = new Person();
        mockPerson.setId(1L);
        mockPerson.setNickname("pedro99");
        mockPerson.setPassword("password123");

        when(personRepository.findByNickname("pedro99")).thenReturn(Optional.of(mockPerson));
        when(personRepository.save(any())).thenReturn(mockPerson);

        Optional<Person> result = personService.login(req);

        assertTrue(result.isPresent());
        assertEquals("pedro99", result.get().getNickname());
    }

    @Test
    @DisplayName("RF-02 | Caso negativo: contraseña incorrecta → Optional vacío")
    void login_casoNegativo_passwordIncorrecta() {
        LoginRequest req = new LoginRequest("pedro99", "wrongpassword");

        Person mockPerson = new Person();
        mockPerson.setNickname("pedro99");
        mockPerson.setPassword("password123");

        when(personRepository.findByNickname("pedro99")).thenReturn(Optional.of(mockPerson));

        Optional<Person> result = personService.login(req);

        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("RF-02 | Caso negativo: usuario no existe → Optional vacío")
    void login_casoNegativo_usuarioNoExiste() {
        LoginRequest req = new LoginRequest("noexiste", "password123");

        when(personRepository.findByNickname("noexiste")).thenReturn(Optional.empty());

        Optional<Person> result = personService.login(req);

        assertTrue(result.isEmpty());
    }

    // ═══════════════════════════════════════════════════════════
    //  RF-32 — Cambiar contraseña
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("RF-32 | Caso positivo: contraseña actual correcta y nueva válida → contraseña actualizada")
    void changePassword_casoPositivo_datosValidos() {
        Person person = new Person();
        person.setId(1L);
        person.setPassword("password123");

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(personRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ChangePasswordRequest req = new ChangePasswordRequest("password123", "nuevaPass456");
        personService.changePassword(1L, req);

        assertEquals("nuevaPass456", person.getPassword());
    }

    @Test
    @DisplayName("RF-32 | Caso negativo: contraseña actual incorrecta → IllegalArgumentException")
    void changePassword_casoNegativo_passwordActualIncorrecta() {
        Person person = new Person();
        person.setId(1L);
        person.setPassword("password123");

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));

        ChangePasswordRequest req = new ChangePasswordRequest("wrongPassword", "nuevaPass456");

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> personService.changePassword(1L, req)
        );

        assertTrue(ex.getMessage().contains("La contraseña actual no es correcta"));
    }

    @Test
    @DisplayName("RF-32 | Caso negativo: nueva contraseña demasiado corta → IllegalArgumentException")
    void changePassword_casoNegativo_nuevaPasswordCorta() {
        Person person = new Person();
        person.setId(1L);
        person.setPassword("password123");

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));

        ChangePasswordRequest req = new ChangePasswordRequest("password123", "abc");
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> personService.changePassword(1L, req)
        );

        assertTrue(ex.getMessage().contains("La nueva contraseña debe tener al menos 8 caracteres"));
    }

    // ═══════════════════════════════════════════════════════════
    //  RF-31 — Editar perfil
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("RF-31 | Caso positivo: nickname válido y disponible → perfil actualizado")
    void update_casoPositivo_nicknameCambiado() {
        Person person = new Person();
        person.setId(1L);
        person.setNickname("pedroGarcia");

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(personRepository.existsByNickname("pedroGarcia2")).thenReturn(false);
        when(personRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdatePersonRequest req = new UpdatePersonRequest(null, null, "pedroGarcia2", null, null);
        Optional<Person> result = personService.update(1L, req);

        assertTrue(result.isPresent());
        assertEquals("pedroGarcia2", result.get().getNickname());
    }

    @Test
    @DisplayName("RF-31 | Caso positivo: email válido y no registrado → email actualizado")
    void update_casoPositivo_emailCambiado() {
        Person person = new Person();
        person.setId(1L);
        person.setNickname("pedroGarcia");
        person.setEmail("pedro@email.com");

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(personRepository.existsByEmail("nuevo@email.com")).thenReturn(false);
        when(personRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdatePersonRequest req = new UpdatePersonRequest(null, null, null, "nuevo@email.com", null);
        Optional<Person> result = personService.update(1L, req);

        assertTrue(result.isPresent());
        assertEquals("nuevo@email.com", result.get().getEmail());
    }

    @Test
    @DisplayName("RF-31 | Caso negativo: nickname ya en uso por otro jugador → IllegalArgumentException")
    void update_casoNegativo_nicknameEnUso() {
        Person person = new Person();
        person.setId(1L);
        person.setNickname("pedroGarcia");

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(personRepository.existsByNickname("luisRuiz")).thenReturn(true);

        UpdatePersonRequest req = new UpdatePersonRequest(null, null, "luisRuiz", null, null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> personService.update(1L, req)
        );

        assertTrue(ex.getMessage().contains("Nickname ya en uso"));
    }

    @Test
    @DisplayName("RF-31 | Caso negativo: email ya en uso por otro jugador → IllegalArgumentException")
    void update_casoNegativo_emailEnUso() {
        Person person = new Person();
        person.setId(1L);
        person.setNickname("pedroGarcia");
        person.setEmail("pedro@email.com");

        when(personRepository.findById(1L)).thenReturn(Optional.of(person));
        when(personRepository.existsByEmail("nuevo@email.com")).thenReturn(true);

        UpdatePersonRequest req = new UpdatePersonRequest(null, null, null, "nuevo@email.com", null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> personService.update(1L, req)
        );

        assertTrue(ex.getMessage().contains("Email ya en uso"));
    }

    // ═══════════════════════════════════════════════════════════
    //  RF-34 — Eliminar cuenta
    // ═══════════════════════════════════════════════════════════

    @Test
    @DisplayName("RF-34 | Caso positivo: cuenta existente → cuenta eliminada, devuelve true")
    void delete_casoPositivo_cuentaEliminada() {
        when(personRepository.existsById(1L)).thenReturn(true);

        boolean result = personService.delete(1L);

        assertTrue(result);
        verify(personRepository).deleteById(1L);
    }

    @Test
    @DisplayName("RF-34 | Caso negativo: cuenta no existe → devuelve false sin borrar nada")
    void delete_casoNegativo_cuentaNoExiste() {
        when(personRepository.existsById(99L)).thenReturn(false);

        boolean result = personService.delete(99L);

        assertFalse(result);
        verify(personRepository, never()).deleteById(any());
    }

}
