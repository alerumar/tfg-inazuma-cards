package com.tfg.inazuma.dto;

import com.tfg.inazuma.model.Trade;
import com.tfg.inazuma.model.TradeStatus;

import java.time.LocalDateTime;

public record TradeResponse(
        Long id,
        PersonResponse initiator,
        PersonResponse receiver,
        CardResponse initiatorCard,
        CardResponse receiverCard,
        TradeStatus status,
        LocalDateTime date
) {
    public static TradeResponse from(Trade t) {
        return new TradeResponse(
                t.getId(),
                PersonResponse.from(t.getInitiator()),
                PersonResponse.from(t.getReceiver()),
                CardResponse.from(t.getInitiatorCard()),
                t.getReceiverCard() != null ? CardResponse.from(t.getReceiverCard()) : null,
                t.getStatus(),
                t.getDate()
        );
    }
}
