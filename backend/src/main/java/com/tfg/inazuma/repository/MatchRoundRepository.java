package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Match;
import com.tfg.inazuma.model.MatchRound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MatchRoundRepository extends JpaRepository<MatchRound, Long> {

    List<MatchRound> findByMatchOrderByRoundNumberAsc(Match match);

    Optional<MatchRound> findFirstByMatchAndCompletedFalse(Match match);

    int countByMatch(Match match);

    /** Borra todas las rondas de partidas en las que participa el jugador — para borrar cuenta. */
    @Modifying
    @Query("DELETE FROM MatchRound r WHERE r.match.player1.id = :personId OR r.match.player2.id = :personId")
    void deleteByMatchPlayer(@Param("personId") Long personId);
}
