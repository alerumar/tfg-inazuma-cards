package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Mission;
import com.tfg.inazuma.model.MissionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface MissionRepository extends JpaRepository<Mission, Long> {

    List<Mission> findByType(MissionType type);

    @Modifying
    @Transactional
    @Query(value = "ALTER TABLE missions AUTO_INCREMENT = 1", nativeQuery = true)
    void resetAutoIncrement();
}
