package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.PersonMission;

public record PersonMissionResponse(
        Long id,
        MissionResponse mission,
        int progress,
        boolean completed,
        double percentage
) {
    public static PersonMissionResponse from(PersonMission pm) {
        int goal = pm.getMission().getGoal();
        int progress = pm.getProgress();
        double percentage = Math.min(100.0, (progress * 100.0) / goal);
        return new PersonMissionResponse(
                pm.getId(),
                MissionResponse.from(pm.getMission()),
                progress,
                progress >= goal,
                Math.round(percentage * 10.0) / 10.0
        );
    }
}
