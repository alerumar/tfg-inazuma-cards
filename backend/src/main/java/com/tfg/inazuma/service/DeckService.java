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

    private final DeckRepository      deckRepository;
    private final DeckCardRepository  deckCardRepository;
    private final PersonRepository    personRepository;
    private final CardRepository      cardRepository;
    private final PersonCardRepository personCardRepository;
    private final MatchRepository     matchRepository;

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

    @Transactional
    public Deck createDeck(Long personId, String name, List<Long> cardIds) {
        Person person = findPersonOrThrow(personId);
        if (name == null || name.isBlank())
            throw new IllegalArgumentException("El nombre es obligatorio");
        if (deckRepository.countByPerson(person) >= MAX_DECKS)
            throw new IllegalArgumentException("Límite de " + MAX_DECKS + " barajas alcanzado");

        Deck deck = new Deck();
        deck.setPerson(person);
        deck.setName(name);
        deckRepository.save(deck);

        for (Long cardId : cardIds) {
            addCard(personId, deck.getId(), cardId);
        }
        return deck;
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

        // Comprobar que el jugador posee la carta
        if (!personCardRepository.findByPersonAndCard(deck.getPerson(), card).isPresent())
            throw new IllegalArgumentException("No tienes esta carta en tu colección");

        // No se puede añadir la misma carta dos veces a la misma baraja
        if (deckCardRepository.countByDeckAndCardId(deck, cardId) >= 1)
            throw new IllegalArgumentException(
                    "\"" + card.getName() + "\" ya está en esta baraja");

        if (deckCardRepository.countByDeck(deck) >= MAX_CARDS)
            throw new IllegalArgumentException("La baraja ya tiene " + MAX_CARDS + " cartas");

        if (card.getType() == CardType.LEGEND && deckCardRepository.countLegendsByDeck(deck) >= MAX_LEGENDS)
            throw new IllegalArgumentException("La baraja ya tiene " + MAX_LEGENDS + " cartas Legend");

        DeckCard dc = new DeckCard();
        dc.setDeck(deck);
        dc.setCard(card);
        return deckCardRepository.save(dc);
    }

    /**
     * Intercambia una carta de la baraja por otra en una sola transacción.
     * Si la nueva carta no cumple las validaciones, la baraja queda intacta.
     */
    @Transactional
    public DeckCard swapCard(Long personId, Long deckId, Long deckCardId, Long newCardId) {
        Deck deck = findDeckOrThrow(deckId);
        validateOwner(deck, personId);

        DeckCard target = deckCardRepository.findById(deckCardId)
                .orElseThrow(() -> new IllegalArgumentException("Carta de baraja no encontrada"));
        if (!target.getDeck().getId().equals(deckId))
            throw new IllegalArgumentException("La carta no pertenece a esta baraja");

        Card newCard = findCardOrThrow(newCardId);

        // El jugador debe poseer la nueva carta
        if (!personCardRepository.findByPersonAndCard(deck.getPerson(), newCard).isPresent())
            throw new IllegalArgumentException("No tienes esta carta en tu colección");

        // No se puede añadir una carta que ya esté en la baraja
        // (salvo que sea la misma que se está reemplazando)
        boolean replacingItself = target.getCard().getId().equals(newCardId);
        if (!replacingItself && deckCardRepository.countByDeckAndCardId(deck, newCardId) >= 1)
            throw new IllegalArgumentException(
                    "\"" + newCard.getName() + "\" ya está en esta baraja");

        // Validar límite de leyendas descontando la carta que se va a reemplazar
        if (newCard.getType() == CardType.LEGEND) {
            int currentLegends   = deckCardRepository.countLegendsByDeck(deck);
            int legendsAfterSwap = currentLegends
                    - (target.getCard().getType() == CardType.LEGEND ? 1 : 0);
            if (legendsAfterSwap >= MAX_LEGENDS)
                throw new IllegalArgumentException(
                        "La baraja ya tiene " + MAX_LEGENDS + " cartas Legend");
        }

        // Todo correcto: actualizar la carta en el mismo registro (sin borrar/crear)
        target.setCard(newCard);
        return deckCardRepository.save(target);
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
        // Quitar referencias en partidas históricas antes de borrar (evita FK constraint)
        matchRepository.clearDeck1References(deckId);
        matchRepository.clearDeck2References(deckId);
        deckCardRepository.deleteByDeck(deck);
        deckRepository.delete(deck);
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
