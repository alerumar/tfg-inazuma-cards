package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Deck;
import com.tfg.inazuma.model.DeckCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DeckCardRepository extends JpaRepository<DeckCard, Long> {

    List<DeckCard> findByDeck(Deck deck);

    int countByDeck(Deck deck);

    @Query("SELECT COUNT(dc) FROM DeckCard dc WHERE dc.deck = :deck AND dc.card.type = com.tfg.inazuma.model.CardType.LEGEND")
    int countLegendsByDeck(@Param("deck") Deck deck);

    void deleteByDeck(Deck deck);

    @Query("SELECT COUNT(dc) FROM DeckCard dc WHERE dc.deck = :deck AND dc.card.id = :cardId")
    int countByDeckAndCardId(@Param("deck") Deck deck, @Param("cardId") Long cardId);

@Modifying
    @Query("DELETE FROM DeckCard dc WHERE dc.deck.person.id = :personId")
    void deleteByDeckPersonId(@Param("personId") Long personId);
}
