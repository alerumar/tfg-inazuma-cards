package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Mission;
import com.tfg.inazuma.model.MissionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MissionRepository extends JpaRepository<Mission, Long> {

    List<Mission> findByType(MissionType type);
}
