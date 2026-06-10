package com.tfg.inazuma.service;

import com.tfg.inazuma.model.Card;
import com.tfg.inazuma.repository.CardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cardRepository;

    public List<Card> findAll() {
        return cardRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
    }

    public Optional<Card> findById(Long id) {
        return cardRepository.findById(id);
    }

    public Card create(Card card) {
        card.setId(null);
        return cardRepository.save(card);
    }

    public Optional<Card> update(Long id, Card updated) {
        return cardRepository.findById(id).map(card -> {
            card.setName(updated.getName());
            card.setCollection(updated.getCollection());
            card.setTeam(updated.getTeam());
            card.setNickname(updated.getNickname());
            card.setImageUrl(updated.getImageUrl());
            card.setType(updated.getType());
            card.setPosition(updated.getPosition());
            card.setAttack(updated.getAttack());
            card.setControl(updated.getControl());
            card.setDefense(updated.getDefense());
            return cardRepository.save(card);
        });
    }

    public boolean delete(Long id) {
        if (!cardRepository.existsById(id)) return false;
        cardRepository.deleteById(id);
        return true;
    }

}
