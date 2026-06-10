package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Deck;
import com.tfg.inazuma.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DeckRepository extends JpaRepository<Deck, Long> {

    List<Deck> findByPerson(Person person);

    int countByPerson(Person person);

@Modifying
    @Query("DELETE FROM Deck d WHERE d.person.id = :personId")
    void deleteByPersonId(@Param("personId") Long personId);
}
