package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.Friendship;
import com.tfg.inazuma.model.FriendshipStatus;

public record FriendshipResponse(
        Long id,
        PersonResponse requester,
        PersonResponse receiver,
        FriendshipStatus status
) {
    public static FriendshipResponse from(Friendship f) {
        return new FriendshipResponse(
                f.getId(),
                PersonResponse.from(f.getRequester()),
                PersonResponse.from(f.getReceiver()),
                f.getStatus()
        );
    }
}
