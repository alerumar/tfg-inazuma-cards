package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Card;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardRepository extends JpaRepository<Card, Long> {
}
