package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PersonRepository extends JpaRepository<Person, Long> {

    Optional<Person> findByEmail(String email);

    Optional<Person> findByPlayerId(String playerId);

    Optional<Person> findByNickname(String nickname);

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    boolean existsByPlayerId(String playerId);
}
