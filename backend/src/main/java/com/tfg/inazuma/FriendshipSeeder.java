package com.tfg.inazuma;

import com.tfg.inazuma.model.Friendship;
import com.tfg.inazuma.model.FriendshipStatus;
import com.tfg.inazuma.model.MissionType;
import com.tfg.inazuma.model.Person;
import com.tfg.inazuma.repository.FriendshipRepository;
import com.tfg.inazuma.repository.PersonRepository;
import com.tfg.inazuma.service.MissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(4)
public class FriendshipSeeder implements CommandLineRunner {

    private final PersonRepository     personRepository;
    private final FriendshipRepository friendshipRepository;
    private final MissionService       missionService;

    @Override
    public void run(String... args) {
        Optional<Person> oAdmin = personRepository.findByNickname("admin");
        Optional<Person> oUser1 = personRepository.findByNickname("user1");
        Optional<Person> oUser2 = personRepository.findByNickname("user2");

        if (oAdmin.isEmpty() || oUser1.isEmpty() || oUser2.isEmpty()) {
            log.info("FriendshipSeeder: seed users not found, skipping.");
            return;
        }

        Person admin = oAdmin.get();
        Person user1 = oUser1.get();
        Person user2 = oUser2.get();

        int created = 0;
        created += ensureFriendship(admin, user1);
        created += ensureFriendship(admin, user2);
        created += ensureFriendship(user1, user2);

        if (created > 0) {
            log.info("FriendshipSeeder: {} amistad(es) de prueba creadas.", created);
        } else {
            log.info("FriendshipSeeder: amistades ya existentes, nada que hacer.");
        }
    }

private int ensureFriendship(Person a, Person b) {
        if (friendshipRepository.findBetween(a, b).isPresent()) return 0;

        Friendship f = new Friendship();
        f.setRequester(a);
        f.setReceiver(b);
        f.setStatus(FriendshipStatus.ACCEPTED);
        friendshipRepository.save(f);

        missionService.recordEvent(a, MissionType.ADD_FRIENDS);
        missionService.recordEvent(b, MissionType.ADD_FRIENDS);
        return 1;
    }
}
