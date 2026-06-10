package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Mission;
import com.tfg.inazuma.model.MissionType;
import com.tfg.inazuma.model.Person;
import com.tfg.inazuma.model.PersonMission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface PersonMissionRepository extends JpaRepository<PersonMission, Long> {

    List<PersonMission> findByPerson(Person person);

    Optional<PersonMission> findByPersonAndMission(Person person, Mission mission);

    @Query("SELECT pm FROM PersonMission pm WHERE pm.person = :person AND pm.mission.type = :type AND pm.progress < pm.mission.goal")
    List<PersonMission> findActiveByPersonAndType(@Param("person") Person person, @Param("type") MissionType type);

    @Modifying
    @Transactional
    @Query("UPDATE PersonMission pm SET pm.progress = LEAST(pm.progress + 1, pm.mission.goal) WHERE pm.person = :person AND pm.mission.type = :type AND pm.progress < pm.mission.goal")
    void incrementProgress(@Param("person") Person person, @Param("type") MissionType type);

@Modifying
    @Query("DELETE FROM PersonMission pm WHERE pm.person.id = :personId")
    void deleteByPersonId(@Param("personId") Long personId);
}
