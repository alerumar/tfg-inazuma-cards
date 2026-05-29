package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PersonRepository extends JpaRepository<Person, Long> {

    Optional<Person> findByEmail(String email);

    Optional<Person> findByPlayerId(String playerId);

    Optional<Person> findByNickname(String nickname);

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    boolean existsByPlayerId(String playerId);

    /** Busca por nickname O por playerId (ambos con LIKE, ignoran mayúsculas). */
    @Query("SELECT p FROM Person p WHERE LOWER(p.nickname) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.playerId) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Person> searchByNicknameOrPlayerId(@Param("q") String q);
}
