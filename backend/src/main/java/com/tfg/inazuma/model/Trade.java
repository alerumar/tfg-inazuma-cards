package com.tfg.inazuma.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "trades")
@Data
@NoArgsConstructor
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "initiator_id")
    private Person initiator;

    @ManyToOne(optional = false)
    @JoinColumn(name = "receiver_id")
    private Person receiver;

    @ManyToOne(optional = false)
    @JoinColumn(name = "initiator_card_id")
    private Card initiatorCard;

    @ManyToOne
    @JoinColumn(name = "receiver_card_id")
    private Card receiverCard;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TradeStatus status = TradeStatus.PENDING_RESPONSE;

    @Column(nullable = false)
    private LocalDateTime date = LocalDateTime.now();
}
