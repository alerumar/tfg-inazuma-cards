package com.tfg.inazuma.service;

import com.tfg.inazuma.model.Card;
import com.tfg.inazuma.repository.CardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CardService {

    private final CardRepository cardRepository;

    public List<Card> findAll() {
        return cardRepository.findAll();
    }

    public Optional<Card> findById(Long id) {
        return cardRepository.findById(id);
    }

    public Card create(Card card) {
        card.setId(null);
        card.setRating(calculateRating(card.getPosition(), card.getAttack(), card.getControl(), card.getDefense()));
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
            card.setRating(calculateRating(card.getPosition(), card.getAttack(), card.getControl(), card.getDefense()));
            return cardRepository.save(card);
        });
    }

    public boolean delete(Long id) {
        if (!cardRepository.existsById(id)) return false;
        cardRepository.deleteById(id);
        return true;
    }

    /**
     * Media ponderada según posición (0-99):
     *
     * GK: ((D/100)^1.08 × 100 × 0.70) + (C × 0.30)
     * DF: ((D/100)^1.05 × 100 × 0.60) + (C × 0.30) + (A × 0.10)
     * MF: ((C/100)^1.05 × 100 × 0.45) + (A × 0.275) + (D × 0.275)
     * FW: ((A/100)^1.05 × 100 × 0.65) + (C × 0.25) + (D × 0.10)
     */
    public int calculateRating(String position, int attack, int control, int defense) {
        if (position == null) {
            return clamp((int) Math.round((attack + control + defense) / 3.0));
        }
        double rating = switch (position) {
            case "GK" -> Math.pow(defense  / 100.0, 1.08) * 100 * 0.70 + control * 0.30;
            case "DF" -> Math.pow(defense  / 100.0, 1.05) * 100 * 0.60 + control * 0.30 + attack * 0.10;
            case "MF" -> Math.pow(control  / 100.0, 1.05) * 100 * 0.45 + attack  * 0.275 + defense * 0.275;
            case "FW" -> Math.pow(attack   / 100.0, 1.05) * 100 * 0.65 + control * 0.25  + defense * 0.10;
            default   -> (attack + control + defense) / 3.0;
        };
        return clamp((int) Math.round(rating));
    }

    private int clamp(int value) {
        return Math.max(0, Math.min(99, value));
    }
}
