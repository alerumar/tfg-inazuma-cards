# ⚡ Inazuma Legends: Cards & Duels

> **Trabajo de Fin de Grado** · Aplicación móvil fullstack de juego de cartas inspirada en el universo de *Inazuma Eleven*.

---

## Índice

- [Descripción](#descripción)
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Funcionalidades](#funcionalidades)
- [Reglas del juego](#reglas-del-juego)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Puesta en marcha](#puesta-en-marcha)
- [Tests](#tests)

---

## Descripción

Aplicación móvil completa que permite a los usuarios coleccionar cartas de personajes de *Inazuma Eleven*, construir barajas y enfrentarse a otros jugadores en tiempo real. El juego se basa en una mecánica de selección simultánea de cartas y atributos, con gestión de amigos, intercambio de cartas y misiones.

---

## Tecnologías

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Java | 21 | Lenguaje principal |
| Spring Boot | 4.0.6 | Framework REST API |
| Spring Data JPA + Hibernate | — | ORM y acceso a datos |
| MariaDB | — | Base de datos relacional |
| Lombok | — | Reducción de boilerplate |
| Maven | 3.9 | Gestión de dependencias |
| JUnit 5 + Mockito | — | Tests unitarios |

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| React Native | 0.81.5 | Framework móvil multiplataforma |
| Expo | ~54.0.34 | Toolchain y build |
| Expo Router | ~6.0.23 | Navegación basada en ficheros |
| TypeScript | ~5.9.2 | Tipado estático |

---

## Arquitectura

```
inazuma/
├── backend/          # API REST (Spring Boot)
└── frontend/         # App móvil (React Native + Expo)
```

El backend expone una **REST API** sin autenticación por token (identificación por ID de usuario en los endpoints). El frontend consume la API mediante polling y llamadas directas. El despliegue se realiza en **Railway** (backend + base de datos MariaDB) y **Expo** (frontend).

### Modelo de dominio principal

```
Person ──< PersonCard >── Card
Person ──< Deck >── DeckCard >── Card
Person ──< PersonMission >── Mission
Person ──< Friendship >── Person
Person ──< Trade >── PersonCard

Match ──< MatchPlayer >── Person + Deck
Match ──< MatchRound ──< MatchTurn ──< MatchTurnMove
```

---

## Funcionalidades

### Cabecera global (todas las pantallas excepto partida)
- **Perfil** — avatar y nombre del jugador; acceso a la pantalla de perfil (editar datos, cambiar contraseña)
- **Puntos de sobre** — contador de puntos disponibles para abrir sobres, actualizado en tiempo real
- **Desplegable superior** — panel colapsable con acceso rápido a:
  - **Barajas** — lista de barajas creadas; acceso al deck builder
  - **Notificaciones** — solicitudes de amistad, resultados de intercambio
  - **Misiones** — progreso de misiones activas y reclamación de recompensas

### Inicio (Home)
- Apertura de sobres de cartas con probabilidades por rareza
- Tienda para adquirir puntos de sobre

### Colección
- Grid completo de todas las cartas del juego
- Cartas no obtenidas → boca abajo en su posición
- Cartas obtenidas → visibles con sus atributos (Ataque, Control, Defensa)
- Tipos de carta: **Normal** y **Leyenda**

### Social
- Búsqueda de jugadores
- Solicitudes de amistad (envío / aceptación / rechazo)
- Lista de amigos

### Partidas
- **Intercambio de cartas** entre amigos (Trade)
- **Partidas 1v1** en tiempo real con mecánica de selección simultánea
- Sistema de revancha

---

## Reglas del juego

### Estructura de una partida
- Cada baraja tiene **5 cartas**; las cartas son permanentes (no se regeneran entre rondas)
- **Ganar 2 turnos → ganar una ronda · Ganar 3 rondas → ganar la partida**

### Mecánica de turno
1. **Selección simultánea** — ambos jugadores eligen una carta y un atributo (hasta 45 segundos)
2. **Reveal** — se revelan ambas elecciones al mismo tiempo con animación
3. **Resolución** — el atributo con mayor valor gana el turno
4. Un atributo usado no puede repetirse en toda la partida para esa carta
5. Cuando los 3 atributos de una carta están agotados → va a la pila de descarte (visible para ambos)

### Información visible
- Las cartas en mano del rival → **boca abajo** (no se ve qué cartas ni atributos tiene)
- La pila de descarte de cada jugador → **visible para ambos** (elemento táctico de deducción)

### Regla Leyenda
- No se puede usar un atributo de una carta **Leyenda en 3 turnos consecutivos** (máximo 2 seguidos)

### Resolución de empate al acabarse los turnos
1. Gana quien tenga más **rondas ganadas**
2. En igualdad → quien tenga más **turnos ganados en la ronda actual**
3. En igualdad total → **empate**

### Timeouts y abandono
- **45 s** por turno sin respuesta → el backend selecciona movimiento aleatorio automáticamente
- **90 s** desconectado durante `IN_PROGRESS` → derrota por abandono

---

## Estructura del proyecto

```
backend/
├── controller/       # Endpoints REST (PersonController, MatchController, …)
├── service/          # Lógica de negocio (MatchService, PackService, …)
├── repository/       # Spring Data JPA repositories
├── model/            # Entidades JPA (Person, Card, Match, MatchTurn, …)
├── dto/              # Request/Response DTOs
└── config/           # CORS y configuración web

frontend/
├── app/
│   ├── (tabs)/       # Navegación principal con tabs (Home, Colección, Social, Partidas)
│   ├── game/[id].tsx # Pantalla de partida en tiempo real
│   ├── deck/         # Deck builder
│   ├── trade/        # Módulo de intercambio
│   └── auth.tsx      # Login / Registro
└── services/         # Capa de acceso a la API REST
```

---

## Puesta en marcha

### Requisitos previos
- Java 21
- Node.js 18+
- MariaDB (local o Railway)
- Expo CLI (`npm install -g expo-cli`)

### Backend

```bash
cd backend

# Configurar la conexión a la base de datos en:
# src/main/resources/application.properties

./mvnw spring-boot:run
```

El servidor arranca en `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm install
npx expo start
```

Escanea el QR con **Expo Go** (Android/iOS) o usa un emulador.

> Configura la URL del backend en `frontend/services/` según el entorno (local o Railway).

---

## Tests

Tests unitarios de capa de servicio con **JUnit 5 + Mockito**. Cada test está etiquetado con el requisito funcional (RF) que valida.

| Clase | RF cubiertos | Qué se prueba |
|---|---|---|
| `PersonServiceTest` | RF-01, RF-02, RF-31, RF-32, RF-34 | Registro, login, edición de perfil, cambio de contraseña, eliminación de cuenta |
| `PackServiceTest` | RF-04, RF-05, RF-08 | Abrir sobre gratuito, abrir sobre de pago, recompensa diaria de puntos |
| `MissionServiceTest` | RF-09 | Reclamación de recompensa de misión (completada, ya reclamada, ajena) |
| `FriendshipServiceTest` | RF-17, RF-19, RF-21 | Envío de solicitud, aceptación/rechazo, cancelación |
| `DeckServiceTest` | RF-35, RF-36, RF-37, RF-38 | Listar barajas, crear baraja, añadir/eliminar carta, borrar baraja |
| `TradeServiceTest` | RF-22, RF-23, RF-24, RF-25, RF-26, RF-27 | Proponer intercambio, responder con carta, confirmar, rechazar en cada fase |
| `MatchServiceTest` | RF-45, RF-46, RF-47, RF-49, RF-50, RF-51, RF-59, RF-62, RF-66, RF-67 | Invitación, lobby, selección de baraja, inicio de partida, jugada, regla Leyenda, abandono, revancha |

```bash
cd backend

# Todos los tests
./mvnw test

# Un módulo concreto
./mvnw test -Dtest=MatchServiceTest
```
