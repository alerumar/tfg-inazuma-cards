package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.Mission;
import com.tfg.inazuma.model.MissionType;

public record MissionResponse(
        Long id,
        String name,
        String description,
        MissionType type,
        int goal,
        int rewardExperience,
        int rewardPoints
) {
    public static MissionResponse from(Mission m) {
        return new MissionResponse(
                m.getId(), m.getName(), m.getDescription(),
                m.getType(), m.getGoal(),
                m.getRewardExperience(), m.getRewardPoints()
        );
    }
}
