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

    @Query("SELECT m FROM Match m WHERE (m.player1 = :person OR m.player2 = :person)")
    List<Match> findByPerson(@Param("person") Person person);

    @Query("SELECT m FROM Match m WHERE m.player1 = :person OR m.player2 = :person ORDER BY m.date DESC")
    List<Match> findByPersonOrderByDateDesc(@Param("person") Person person);
}
