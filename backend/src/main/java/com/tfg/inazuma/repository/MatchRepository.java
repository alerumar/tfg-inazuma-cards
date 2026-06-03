package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Match;
import com.tfg.inazuma.model.MatchStatus;
import com.tfg.inazuma.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Long> {

    @Query("SELECT m FROM Match m WHERE (m.player1 = :person OR m.player2 = :person) AND m.status = :status")
    List<Match> findByPersonAndStatus(@Param("person") Person person, @Param("status") MatchStatus status);

    @Query("SELECT m FROM Match m WHERE (m.player1 = :person OR m.player2 = :person) AND m.status IN :statuses")
    List<Match> findByPersonAndStatusIn(@Param("person") Person person, @Param("statuses") List<MatchStatus> statuses);

    /** Invitaciones pendientes donde este jugador es el receptor. */
    @Query("SELECT m FROM Match m WHERE m.player2 = :person AND m.status = 'PENDING_INVITE'")
    List<Match> findPendingInvitesForReceiver(@Param("person") Person person);

    /** Partidas activas (cualquier estado no terminal) de un jugador. */
    @Query("SELECT m FROM Match m WHERE (m.player1 = :person OR m.player2 = :person) " +
           "AND m.status IN ('PENDING_INVITE','WAITING_READY','IN_PROGRESS')")
    List<Match> findActiveForPerson(@Param("person") Person person);

    @Query("SELECT m FROM Match m WHERE (m.player1 = :person OR m.player2 = :person) " +
           "AND m.status IN ('FINISHED','REJECTED','CANCELLED') ORDER BY m.createdAt DESC")
    List<Match> findHistoryForPerson(@Param("person") Person person);

    /** Todas las partidas en un estado concreto — usado por el scheduler. */
    List<Match> findAllByStatus(MatchStatus status);
}
