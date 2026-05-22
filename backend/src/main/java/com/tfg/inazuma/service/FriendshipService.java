package com.tfg.inazuma.service;

import com.tfg.inazuma.model.Friendship;
import com.tfg.inazuma.model.FriendshipStatus;
import com.tfg.inazuma.model.Person;
import com.tfg.inazuma.repository.FriendshipRepository;
import com.tfg.inazuma.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final PersonRepository personRepository;

    public Friendship sendRequest(Long requesterId, String receiverPlayerId) {
        Person requester = findPersonOrThrow(requesterId);
        Person receiver = personRepository.findByPlayerId(receiverPlayerId)
                .orElseThrow(() -> new IllegalArgumentException("Jugador no encontrado"));

        if (requester.getId().equals(receiver.getId()))
            throw new IllegalArgumentException("No puedes enviarte una solicitud a ti mismo");

        if (friendshipRepository.findBetween(requester, receiver).isPresent())
            throw new IllegalArgumentException("Ya existe una relación de amistad con este jugador");

        Friendship friendship = new Friendship();
        friendship.setRequester(requester);
        friendship.setReceiver(receiver);
        return friendshipRepository.save(friendship);
    }

    public Friendship accept(Long friendshipId, Long receiverId) {
        Friendship friendship = findFriendshipOrThrow(friendshipId);
        validateReceiver(friendship, receiverId);
        friendship.setStatus(FriendshipStatus.ACCEPTED);
        return friendshipRepository.save(friendship);
    }

    public void reject(Long friendshipId, Long receiverId) {
        Friendship friendship = findFriendshipOrThrow(friendshipId);
        validateReceiver(friendship, receiverId);
        friendshipRepository.delete(friendship);
    }

    public void removeFriend(Long personId, Long friendshipId) {
        Friendship friendship = findFriendshipOrThrow(friendshipId);
        if (!friendship.getRequester().getId().equals(personId) &&
            !friendship.getReceiver().getId().equals(personId))
            throw new IllegalArgumentException("No perteneces a esta amistad");
        friendshipRepository.delete(friendship);
    }

    public List<Friendship> getFriends(Long personId) {
        Person person = findPersonOrThrow(personId);
        return friendshipRepository.findByPersonAndStatus(person, FriendshipStatus.ACCEPTED);
    }

    public List<Friendship> getPendingReceived(Long personId) {
        Person person = findPersonOrThrow(personId);
        return friendshipRepository.findByReceiverAndStatus(person, FriendshipStatus.PENDING);
    }

    public List<Friendship> getPendingSent(Long personId) {
        Person person = findPersonOrThrow(personId);
        return friendshipRepository.findByRequesterAndStatus(person, FriendshipStatus.PENDING);
    }

    public Optional<Friendship> findBetween(Long personId, Long otherId) {
        Person person = findPersonOrThrow(personId);
        Person other = findPersonOrThrow(otherId);
        return friendshipRepository.findBetween(person, other);
    }

    private Person findPersonOrThrow(Long id) {
        return personRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Persona no encontrada"));
    }

    private Friendship findFriendshipOrThrow(Long id) {
        return friendshipRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Solicitud no encontrada"));
    }

    private void validateReceiver(Friendship friendship, Long receiverId) {
        if (!friendship.getReceiver().getId().equals(receiverId))
            throw new IllegalArgumentException("No eres el destinatario de esta solicitud");
    }
}
