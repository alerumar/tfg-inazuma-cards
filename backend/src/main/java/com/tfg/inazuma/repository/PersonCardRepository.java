package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Card;
import com.tfg.inazuma.model.Person;
import com.tfg.inazuma.model.PersonCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PersonCardRepository extends JpaRepository<PersonCard, Long> {

    List<PersonCard> findByPerson(Person person);

    Optional<PersonCard> findByPersonAndCard(Person person, Card card);

    List<PersonCard> findByPersonAndQuantityGreaterThan(Person person, int quantity);

    @Query("SELECT SUM(pc.quantity) FROM PersonCard pc WHERE pc.person = :person")
    Integer sumQuantityByPerson(@Param("person") Person person);

    boolean existsByPersonAndCard(Person person, Card card);
}
