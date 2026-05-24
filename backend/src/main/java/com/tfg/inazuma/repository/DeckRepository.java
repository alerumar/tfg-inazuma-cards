package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Deck;
import com.tfg.inazuma.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeckRepository extends JpaRepository<Deck, Long> {

    List<Deck> findByPerson(Person person);

    int countByPerson(Person person);
}
