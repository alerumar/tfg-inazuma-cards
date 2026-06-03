package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Match;
import com.tfg.inazuma.model.MatchRound;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MatchRoundRepository extends JpaRepository<MatchRound, Long> {

    List<MatchRound> findByMatchOrderByRoundNumberAsc(Match match);

    Optional<MatchRound> findFirstByMatchAndCompletedFalse(Match match);

    int countByMatch(Match match);
}
