package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Friendship;
import com.tfg.inazuma.model.FriendshipStatus;
import com.tfg.inazuma.model.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    @Query("SELECT f FROM Friendship f WHERE (f.requester = :person OR f.receiver = :person) AND f.status = :status")
    List<Friendship> findByPersonAndStatus(@Param("person") Person person, @Param("status") FriendshipStatus status);

    List<Friendship> findByReceiverAndStatus(Person receiver, FriendshipStatus status);

    List<Friendship> findByRequesterAndStatus(Person requester, FriendshipStatus status);

    @Query("SELECT f FROM Friendship f WHERE (f.requester = :a AND f.receiver = :b) OR (f.requester = :b AND f.receiver = :a)")
    Optional<Friendship> findBetween(@Param("a") Person a, @Param("b") Person b);

    boolean existsByRequesterAndReceiver(Person requester, Person receiver);

    @Query("SELECT COUNT(f) FROM Friendship f WHERE (f.requester = :person OR f.receiver = :person) AND f.status = :status")
    long countByPersonAndStatus(@Param("person") Person person, @Param("status") FriendshipStatus status);

@Modifying
    @Query("DELETE FROM Friendship f WHERE f.requester.id = :personId OR f.receiver.id = :personId")
    void deleteByPersonId(@Param("personId") Long personId);
}
