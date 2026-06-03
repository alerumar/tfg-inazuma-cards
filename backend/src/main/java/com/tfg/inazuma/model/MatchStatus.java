package com.tfg.inazuma.model;

public enum MatchStatus {
    PENDING_INVITE,  // Invitación enviada, pendiente de respuesta
    WAITING_READY,   // Ambos en el lobby, eligiendo baraja y pulsando "Listo"
    IN_PROGRESS,     // Partida en curso
    FINISHED,        // Partida terminada (winner != null → ganador; null → empate)
    REJECTED,        // El receptor rechazó la invitación
    CANCELLED        // Cancelada por cualquiera de los dos antes de empezar
}
