package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Card;
import com.tfg.inazuma.model.CardType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardRepository extends JpaRepository<Card, Long> {
    boolean existsByCollection(String collection);

    long countByType(CardType type);
}
