package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.Notification;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long          id,
        String        type,
        String        message,
        boolean       read,
        String        actorNickname,
        String        actorProfilePhoto,
        LocalDateTime createdAt
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getType(),
                n.getMessage(),
                n.isRead(),
                n.getActor() != null ? n.getActor().getNickname()     : null,
                n.getActor() != null ? n.getActor().getProfilePhoto() : null,
                n.getCreatedAt()
        );
    }
}
