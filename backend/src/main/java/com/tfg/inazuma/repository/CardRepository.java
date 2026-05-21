package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface CardRepository extends JpaRepository<Card, Long> {
    boolean existsByCollection(String collection);

    @Modifying
    @Transactional
    @Query(value = "TRUNCATE TABLE cards", nativeQuery = true)
    void truncate();

    @Modifying
    @Transactional
    @Query(value = "ALTER TABLE cards AUTO_INCREMENT = 1", nativeQuery = true)
    void resetAutoIncrement();
}
