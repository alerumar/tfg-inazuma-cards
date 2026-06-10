package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.PersonMission;

public record PersonMissionResponse(
        Long id,
        MissionResponse mission,
        int progress,
        boolean completed,
        boolean claimed,
        double percentage
) {
    public static PersonMissionResponse from(PersonMission pm) {
        int goal       = pm.getMission().getGoal();
        int progress   = pm.getProgress();
        double pct     = Math.min(100.0, (progress * 100.0) / goal);
        return new PersonMissionResponse(
                pm.getId(),
                MissionResponse.from(pm.getMission()),
                progress,
                progress >= goal,
                pm.isClaimed(),
                Math.round(pct * 10.0) / 10.0
        );
    }
}
