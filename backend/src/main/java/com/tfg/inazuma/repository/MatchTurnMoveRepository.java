package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Match;
import com.tfg.inazuma.model.MatchTurn;
import com.tfg.inazuma.model.MatchTurnMove;
import com.tfg.inazuma.model.Person;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MatchTurnMoveRepository extends JpaRepository<MatchTurnMove, Long> {

    List<MatchTurnMove> findByTurn(MatchTurn turn);

    boolean existsByTurnAndPlayer(MatchTurn turn, Person player);

    /**
     * SELECT … FOR UPDATE sobre las jugadas de un turno.
     * Permite leer el estado completo del turno con garantía de consistencia
     * cuando se comprueba si ambos jugadores ya enviaron.
     */
    @Query("SELECT m FROM MatchTurnMove m WHERE m.turn = :turn")
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<MatchTurnMove> findByTurnForUpdate(@Param("turn") MatchTurn turn);

    /**
     * Todas las jugadas de turnos ya resueltos en una partida.
     * Usado para calcular atributos usados e historial de movimientos.
     */
    @Query("SELECT m FROM MatchTurnMove m " +
           "WHERE m.turn.round.match = :match AND m.turn.result <> 'PENDING'")
    List<MatchTurnMove> findAllCompletedByMatch(@Param("match") Match match);

    @Modifying
    @Query("DELETE FROM MatchTurnMove m " +
           "WHERE m.turn.round.match.player1.id = :personId " +
           "   OR m.turn.round.match.player2.id = :personId")
    void deleteByMatchPlayer(@Param("personId") Long personId);
}
