package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Match;
import com.tfg.inazuma.model.MatchPlayer;
import com.tfg.inazuma.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MatchPlayerRepository extends JpaRepository<MatchPlayer, Long> {

    List<MatchPlayer> findByMatch(Match match);

    Optional<MatchPlayer> findByMatchAndPlayer(Match match, Person player);

    @Query("SELECT mp FROM MatchPlayer mp WHERE mp.match = :match AND mp.player.id = :playerId")
    Optional<MatchPlayer> findByMatchAndPlayerId(@Param("match") Match match,
                                                  @Param("playerId") Long playerId);

    /**
     * Pone a null la baraja en todos los MatchPlayer que la referencian.
     * Sustituye a clearDeck1References + clearDeck2References del antiguo MatchRepository.
     */
    @Modifying
    @Query("UPDATE MatchPlayer mp SET mp.deck = null WHERE mp.deck.id = :deckId")
    void clearDeckReferences(@Param("deckId") Long deckId);

    @Modifying
    @Query("DELETE FROM MatchPlayer mp " +
           "WHERE mp.match.player1.id = :personId OR mp.match.player2.id = :personId")
    void deleteByMatchPlayer(@Param("personId") Long personId);
}
