package com.tfg.inazuma.service;

import com.tfg.inazuma.dto.PersonSearchResult;
import com.tfg.inazuma.dto.PersonResponse;
import com.tfg.inazuma.model.Friendship;
import com.tfg.inazuma.model.FriendshipStatus;
import com.tfg.inazuma.model.MissionType;
import com.tfg.inazuma.model.Person;
import com.tfg.inazuma.repository.FriendshipRepository;
import com.tfg.inazuma.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final PersonRepository     personRepository;
    private final MissionService       missionService;
    private final NotificationService  notificationService;

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

    @Transactional
    public Friendship accept(Long friendshipId, Long receiverId) {
        Friendship friendship = findFriendshipOrThrow(friendshipId);
        validateReceiver(friendship, receiverId);
        friendship.setStatus(FriendshipStatus.ACCEPTED);
        Friendship saved = friendshipRepository.save(friendship);

        // Progreso de misión ADD_FRIENDS para ambas partes
        missionService.recordEvent(friendship.getRequester(), MissionType.ADD_FRIENDS);
        missionService.recordEvent(friendship.getReceiver(),  MissionType.ADD_FRIENDS);

        // RF-62: notificar al remitente que su solicitud fue aceptada
        String acceptorNick = friendship.getReceiver().getNickname();
        notificationService.create(
                friendship.getRequester(),
                friendship.getReceiver(),
                "FRIEND_REQUEST_ACCEPTED",
                "¡" + acceptorNick + " y tú ahora sois amigos!"
        );

        return saved;
    }

    @Transactional
    public void reject(Long friendshipId, Long receiverId) {
        Friendship friendship = findFriendshipOrThrow(friendshipId);
        validateReceiver(friendship, receiverId);

        // RF-61: notificar al remitente que su solicitud fue rechazada
        String rejectorNick = friendship.getReceiver().getNickname();
        notificationService.create(
                friendship.getRequester(),
                friendship.getReceiver(),
                "FRIEND_REQUEST_REJECTED",
                rejectorNick + " ha rechazado tu solicitud de amistad"
        );

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

    /** RF-20: busca usuarios por nickname (contiene) o playerId exacto. */
    public List<PersonSearchResult> searchPersons(Long requesterId, String q) {
        Person requester = findPersonOrThrow(requesterId);
        return personRepository.searchByNicknameOrPlayerId(q).stream()
                .filter(p -> !p.getId().equals(requesterId))
                .map(p -> {
                    var fs = friendshipRepository.findBetween(requester, p);
                    if (fs.isEmpty())
                        return new PersonSearchResult(PersonResponse.from(p), null, null);
                    Friendship f = fs.get();
                    String status = f.getStatus() == FriendshipStatus.ACCEPTED ? "ACCEPTED"
                            : f.getRequester().getId().equals(requesterId)     ? "PENDING_SENT"
                            :                                                    "PENDING_RECEIVED";
                    return new PersonSearchResult(PersonResponse.from(p), status, f.getId());
                })
                .toList();
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
