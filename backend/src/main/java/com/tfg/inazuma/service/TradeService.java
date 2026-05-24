package com.tfg.inazuma.service;

import com.tfg.inazuma.model.*;
import com.tfg.inazuma.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TradeService {

    private static final List<TradeStatus> ACTIVE_STATUSES = List.of(
            TradeStatus.PENDING_RESPONSE,
            TradeStatus.PENDING_CONFIRMATION
    );

    private final TradeRepository      tradeRepository;
    private final PersonRepository     personRepository;
    private final CardRepository       cardRepository;
    private final PersonCardRepository personCardRepository;
    private final FriendshipRepository friendshipRepository;
    private final MissionService       missionService;

    @Transactional
    public Trade propose(Long initiatorId, Long receiverId, Long cardId) {
        Person initiator = findPersonOrThrow(initiatorId);
        Person receiver  = findPersonOrThrow(receiverId);

        if (initiator.getId().equals(receiver.getId()))
            throw new IllegalArgumentException("No puedes intercambiar contigo mismo");

        friendshipRepository.findBetween(initiator, receiver)
                .filter(f -> f.getStatus() == FriendshipStatus.ACCEPTED)
                .orElseThrow(() -> new IllegalArgumentException("Solo puedes intercambiar con amigos"));

        if (!tradeRepository.findActiveByPerson(initiator, ACTIVE_STATUSES).isEmpty())
            throw new IllegalArgumentException("Ya tienes un intercambio activo en curso");

        Card card = findCardOrThrow(cardId);
        PersonCard pc = personCardRepository.findByPersonAndCard(initiator, card)
                .orElseThrow(() -> new IllegalArgumentException("No tienes esta carta"));
        if (pc.getQuantity() < 2)
            throw new IllegalArgumentException("Solo puedes ofrecer cartas que tengas repetidas");

        Trade trade = new Trade();
        trade.setInitiator(initiator);
        trade.setReceiver(receiver);
        trade.setInitiatorCard(card);
        return tradeRepository.save(trade);
    }

    @Transactional
    public Trade receiverRespond(Long tradeId, Long receiverId, Long receiverCardId) {
        Trade trade = findTradeOrThrow(tradeId);
        validateReceiver(trade, receiverId);
        if (trade.getStatus() != TradeStatus.PENDING_RESPONSE)
            throw new IllegalArgumentException("El intercambio no está pendiente de respuesta");

        if (receiverCardId == null) {
            trade.setStatus(TradeStatus.REJECTED_BY_RECEIVER);
            return tradeRepository.save(trade);
        }

        Card card = findCardOrThrow(receiverCardId);
        if (card.getType() != trade.getInitiatorCard().getType())
            throw new IllegalArgumentException("La carta ofrecida debe ser del mismo tipo que la solicitada");

        Person receiver = findPersonOrThrow(receiverId);
        PersonCard pc = personCardRepository.findByPersonAndCard(receiver, card)
                .orElseThrow(() -> new IllegalArgumentException("No tienes esta carta"));
        if (pc.getQuantity() < 2)
            throw new IllegalArgumentException("Solo puedes ofrecer cartas que tengas repetidas");

        trade.setReceiverCard(card);
        trade.setStatus(TradeStatus.PENDING_CONFIRMATION);
        return tradeRepository.save(trade);
    }

    @Transactional
    public Trade initiatorConfirm(Long tradeId, Long initiatorId, boolean accept) {
        Trade trade = findTradeOrThrow(tradeId);
        validateInitiator(trade, initiatorId);
        if (trade.getStatus() != TradeStatus.PENDING_CONFIRMATION)
            throw new IllegalArgumentException("El intercambio no está pendiente de confirmación");

        if (!accept) {
            trade.setStatus(TradeStatus.REJECTED_BY_INITIATOR);
            return tradeRepository.save(trade);
        }

        executeSwap(trade);
        trade.setStatus(TradeStatus.COMPLETED);
        tradeRepository.save(trade);

        missionService.recordEvent(trade.getInitiator(), MissionType.COMPLETE_TRADES);
        missionService.recordEvent(trade.getReceiver(), MissionType.COMPLETE_TRADES);

        return trade;
    }

    public Optional<Trade> findById(Long id) {
        return tradeRepository.findById(id);
    }

    public List<Trade> getHistory(Long personId) {
        Person person = findPersonOrThrow(personId);
        return tradeRepository.findByInitiatorOrReceiverOrderByDateDesc(person, person);
    }

    public List<Trade> getActive(Long personId) {
        Person person = findPersonOrThrow(personId);
        return tradeRepository.findActiveByPerson(person, ACTIVE_STATUSES);
    }

    private void executeSwap(Trade trade) {
        Person initiator = trade.getInitiator();
        Person receiver  = trade.getReceiver();
        Card   cardA     = trade.getInitiatorCard();
        Card   cardB     = trade.getReceiverCard();

        removeOneCard(initiator, cardA);
        addOneCard(initiator, cardB);
        removeOneCard(receiver, cardB);
        addOneCard(receiver, cardA);
    }

    private void removeOneCard(Person person, Card card) {
        PersonCard pc = personCardRepository.findByPersonAndCard(person, card)
                .orElseThrow(() -> new IllegalStateException("Carta no encontrada en colección"));
        if (pc.getQuantity() <= 1) personCardRepository.delete(pc);
        else { pc.setQuantity(pc.getQuantity() - 1); personCardRepository.save(pc); }
    }

    private void addOneCard(Person person, Card card) {
        personCardRepository.findByPersonAndCard(person, card).ifPresentOrElse(
                pc -> { pc.setQuantity(pc.getQuantity() + 1); personCardRepository.save(pc); },
                () -> { PersonCard pc = new PersonCard(); pc.setPerson(person); pc.setCard(card); personCardRepository.save(pc); }
        );
    }

    private void validateReceiver(Trade trade, Long receiverId) {
        if (!trade.getReceiver().getId().equals(receiverId))
            throw new IllegalArgumentException("No eres el receptor de este intercambio");
    }

    private void validateInitiator(Trade trade, Long initiatorId) {
        if (!trade.getInitiator().getId().equals(initiatorId))
            throw new IllegalArgumentException("No eres el iniciador de este intercambio");
    }

    private Trade findTradeOrThrow(Long id) {
        return tradeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Intercambio no encontrado"));
    }

    private Person findPersonOrThrow(Long id) {
        return personRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Persona no encontrada"));
    }

    private Card findCardOrThrow(Long id) {
        return cardRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Carta no encontrada"));
    }
}
