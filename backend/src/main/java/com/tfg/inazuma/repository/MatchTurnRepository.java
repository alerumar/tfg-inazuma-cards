package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Match;
import com.tfg.inazuma.model.MatchRound;
import com.tfg.inazuma.model.MatchTurn;
import com.tfg.inazuma.model.TurnResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MatchTurnRepository extends JpaRepository<MatchTurn, Long> {

    List<MatchTurn> findByRoundOrderByTurnNumberAsc(MatchRound round);

    Optional<MatchTurn> findFirstByRoundAndResult(MatchRound round, TurnResult result);

    Optional<MatchTurn> findTopByRoundOrderByTurnNumberDesc(MatchRound round);

@Query("SELECT t FROM MatchTurn t WHERE t.round.match = :match AND t.result <> 'PENDING'")
    List<MatchTurn> findAllCompletedByMatch(@Param("match") Match match);

@Query("SELECT t FROM MatchTurn t WHERE t.round.match = :match ORDER BY t.round.roundNumber ASC, t.turnNumber ASC")
    List<MatchTurn> findAllByMatchOrdered(@Param("match") Match match);

@Query("SELECT t FROM MatchTurn t WHERE t.round.match.status = 'IN_PROGRESS' AND t.result = 'PENDING'")
    List<MatchTurn> findAllPendingInProgressTurns();

@Modifying
    @Query("DELETE FROM MatchTurn t WHERE t.round.match.player1.id = :personId OR t.round.match.player2.id = :personId")
    void deleteByMatchPlayer(@Param("personId") Long personId);
}
