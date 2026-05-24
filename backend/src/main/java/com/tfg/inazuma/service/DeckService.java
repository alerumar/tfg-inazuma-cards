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
public class DeckService {

    private static final int MAX_DECKS     = 10;
    private static final int MAX_CARDS     = 5;
    private static final int MAX_LEGENDS   = 2;

    private final DeckRepository     deckRepository;
    private final DeckCardRepository deckCardRepository;
    private final PersonRepository   personRepository;
    private final CardRepository     cardRepository;
    private final PersonCardRepository personCardRepository;

    public List<Deck> getDecks(Long personId) {
        return deckRepository.findByPerson(findPersonOrThrow(personId));
    }

    public Optional<Deck> findById(Long deckId) {
        return deckRepository.findById(deckId);
    }

    public List<DeckCard> getCards(Long deckId) {
        Deck deck = findDeckOrThrow(deckId);
        return deckCardRepository.findByDeck(deck);
    }

    public Deck createDeck(Long personId, String name) {
        Person person = findPersonOrThrow(personId);
        if (deckRepository.countByPerson(person) >= MAX_DECKS)
            throw new IllegalArgumentException("Límite de " + MAX_DECKS + " barajas alcanzado");

        Deck deck = new Deck();
        deck.setPerson(person);
        deck.setName(name);
        return deckRepository.save(deck);
    }

    public Deck renameDeck(Long personId, Long deckId, String name) {
        Deck deck = findDeckOrThrow(deckId);
        validateOwner(deck, personId);
        deck.setName(name);
        return deckRepository.save(deck);
    }

    @Transactional
    public DeckCard addCard(Long personId, Long deckId, Long cardId) {
        Deck deck = findDeckOrThrow(deckId);
        validateOwner(deck, personId);
        Card card = findCardOrThrow(cardId);

        validatePersonOwnsCard(deck.getPerson(), card);

        if (deckCardRepository.countByDeck(deck) >= MAX_CARDS)
            throw new IllegalArgumentException("La baraja ya tiene " + MAX_CARDS + " cartas");

        if (card.getType() == CardType.LEGEND && deckCardRepository.countLegendsByDeck(deck) >= MAX_LEGENDS)
            throw new IllegalArgumentException("La baraja ya tiene " + MAX_LEGENDS + " cartas Legend");

        DeckCard dc = new DeckCard();
        dc.setDeck(deck);
        dc.setCard(card);
        return deckCardRepository.save(dc);
    }

    @Transactional
    public void removeCard(Long personId, Long deckId, Long deckCardId) {
        Deck deck = findDeckOrThrow(deckId);
        validateOwner(deck, personId);
        DeckCard dc = deckCardRepository.findById(deckCardId)
                .orElseThrow(() -> new IllegalArgumentException("Carta de baraja no encontrada"));
        if (!dc.getDeck().getId().equals(deckId))
            throw new IllegalArgumentException("La carta no pertenece a esta baraja");
        deckCardRepository.delete(dc);
    }

    @Transactional
    public void deleteDeck(Long personId, Long deckId) {
        Deck deck = findDeckOrThrow(deckId);
        validateOwner(deck, personId);
        deckCardRepository.deleteByDeck(deck);
        deckRepository.delete(deck);
    }

    private void validatePersonOwnsCard(Person person, Card card) {
        personCardRepository.findByPersonAndCard(person, card)
                .orElseThrow(() -> new IllegalArgumentException("No tienes esta carta en tu colección"));
    }

    private void validateOwner(Deck deck, Long personId) {
        if (!deck.getPerson().getId().equals(personId))
            throw new IllegalArgumentException("Esta baraja no te pertenece");
    }

    private Person findPersonOrThrow(Long id) {
        return personRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Persona no encontrada"));
    }

    private Deck findDeckOrThrow(Long id) {
        return deckRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Baraja no encontrada"));
    }

    private Card findCardOrThrow(Long id) {
        return cardRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Carta no encontrada"));
    }
}
