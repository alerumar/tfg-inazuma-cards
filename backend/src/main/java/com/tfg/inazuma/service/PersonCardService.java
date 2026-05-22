package com.tfg.inazuma.service;

import com.tfg.inazuma.model.Card;
import com.tfg.inazuma.model.Person;
import com.tfg.inazuma.model.PersonCard;
import com.tfg.inazuma.repository.CardRepository;
import com.tfg.inazuma.repository.PersonCardRepository;
import com.tfg.inazuma.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PersonCardService {

    private final PersonCardRepository personCardRepository;
    private final PersonRepository personRepository;
    private final CardRepository cardRepository;

    public List<PersonCard> getCollection(Long personId) {
        Person person = findPersonOrThrow(personId);
        return personCardRepository.findByPerson(person);
    }

    public List<PersonCard> getDuplicates(Long personId) {
        Person person = findPersonOrThrow(personId);
        return personCardRepository.findByPersonAndQuantityGreaterThan(person, 1);
    }

    public int getTotalCards(Long personId) {
        Person person = findPersonOrThrow(personId);
        Integer total = personCardRepository.sumQuantityByPerson(person);
        return total != null ? total : 0;
    }

    public PersonCard addCard(Long personId, Long cardId) {
        Person person = findPersonOrThrow(personId);
        Card card = findCardOrThrow(cardId);

        return personCardRepository.findByPersonAndCard(person, card)
                .map(pc -> {
                    pc.setQuantity(pc.getQuantity() + 1);
                    return personCardRepository.save(pc);
                })
                .orElseGet(() -> {
                    PersonCard pc = new PersonCard();
                    pc.setPerson(person);
                    pc.setCard(card);
                    return personCardRepository.save(pc);
                });
    }

    public Optional<PersonCard> removeCard(Long personId, Long cardId) {
        Person person = findPersonOrThrow(personId);
        Card card = findCardOrThrow(cardId);

        return personCardRepository.findByPersonAndCard(person, card).map(pc -> {
            if (pc.getQuantity() <= 1) {
                personCardRepository.delete(pc);
                return null;
            }
            pc.setQuantity(pc.getQuantity() - 1);
            return personCardRepository.save(pc);
        });
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
