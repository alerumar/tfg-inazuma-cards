package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Match;
import com.tfg.inazuma.model.MatchStatus;
import com.tfg.inazuma.model.Person;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<Match, Long> {

    /**
     * SELECT … FOR UPDATE sobre la partida.
     * Serializa accesos concurrentes en setReady/submitMove para que dos
     * jugadores simultáneos no se pisen mutuamente.
     */
    @Query("SELECT m FROM Match m WHERE m.id = :id")
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Match> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT m FROM Match m WHERE (m.player1 = :person OR m.player2 = :person) AND m.status = :status")
    List<Match> findByPersonAndStatus(@Param("person") Person person,
                                      @Param("status") MatchStatus status);

    @Query("SELECT m FROM Match m WHERE (m.player1 = :person OR m.player2 = :person) AND m.status IN :statuses")
    List<Match> findByPersonAndStatusIn(@Param("person") Person person,
                                        @Param("statuses") List<MatchStatus> statuses);

    @Query("SELECT m FROM Match m WHERE m.player2 = :person AND m.status = 'PENDING_INVITE'")
    List<Match> findPendingInvitesForReceiver(@Param("person") Person person);

    @Query("SELECT m FROM Match m WHERE (m.player1 = :person OR m.player2 = :person) " +
           "AND m.status IN ('PENDING_INVITE','WAITING_READY','IN_PROGRESS')")
    List<Match> findActiveForPerson(@Param("person") Person person);

    @Query("SELECT m FROM Match m WHERE (m.player1 = :person OR m.player2 = :person) " +
           "AND m.status IN ('FINISHED','REJECTED','CANCELLED') ORDER BY m.createdAt DESC")
    List<Match> findHistoryForPerson(@Param("person") Person person);

    List<Match> findAllByStatus(MatchStatus status);

    @Modifying
    @Query("UPDATE Match m SET m.winner = null WHERE m.winner.id = :personId")
    void nullifyWinner(@Param("personId") Long personId);

    @Modifying
    @Query("DELETE FROM Match m WHERE m.player1.id = :personId OR m.player2.id = :personId")
    void deleteByPlayer(@Param("personId") Long personId);
}
