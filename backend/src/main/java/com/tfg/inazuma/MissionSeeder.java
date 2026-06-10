package com.tfg.inazuma;

import com.tfg.inazuma.model.CardType;
import com.tfg.inazuma.model.Mission;
import com.tfg.inazuma.model.MissionType;
import com.tfg.inazuma.repository.CardRepository;
import com.tfg.inazuma.repository.MissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(2)
public class MissionSeeder implements CommandLineRunner {

    private final MissionRepository missionRepository;
    private final CardRepository    cardRepository;

    @Override
    public void run(String... args) {
        if (missionRepository.count() > 0) {
            log.info("Missions already seeded, skipping.");
            return;
        }

        long totalCards   = cardRepository.count();
        long totalLegends = cardRepository.countByType(CardType.LEGEND);

        List<Mission> missions = List.of(

            mission("Novato ganador",       "Gana 5 partidas",   MissionType.WIN_MATCHES,   5,   50,  6),
            mission("Veterano ganador",     "Gana 15 partidas",  MissionType.WIN_MATCHES,  15,  100, 12),
            mission("Campeón",              "Gana 30 partidas",  MissionType.WIN_MATCHES,  30,  200, 18),

            mission("Primeros pasos",       "Juega 5 partidas",  MissionType.PLAY_MATCHES,  5,   50,  4),
            mission("En racha",             "Juega 15 partidas", MissionType.PLAY_MATCHES, 15,  100,  8),
            mission("Incansable",           "Juega 30 partidas", MissionType.PLAY_MATCHES, 30,  200, 12),

            mission("Coleccionista novato",   "Colecciona 50 cartas",         MissionType.COLLECT_CARDS,  50,   50, 12),
            mission("Coleccionista avanzado", "Colecciona 100 cartas",        MissionType.COLLECT_CARDS, 100,  100, 18),
            mission("Gran coleccionista",     "Colecciona 200 cartas",        MissionType.COLLECT_CARDS, 200,  200, 24),
            mission("Colección completa",     "Colecciona todas las cartas",  MissionType.COLLECT_CARDS, (int) totalCards, 800, 0),

            mission("Primer destello",      "Colecciona 3 cartas Legend",               MissionType.COLLECT_LEGENDS,  3,   50,  6),
            mission("Cazador de leyendas",  "Colecciona 10 cartas Legend",              MissionType.COLLECT_LEGENDS, 10,  150, 12),
            mission("Maestro de leyendas",  "Colecciona 20 cartas Legend",              MissionType.COLLECT_LEGENDS, 20,  300, 18),
            mission("Legado legendario",    "Colecciona todas las cartas Legend",       MissionType.COLLECT_LEGENDS, (int) totalLegends, 600, 24),

            mission("Abre sobres I",        "Abre 10 sobres",   MissionType.OPEN_PACKS,  10,   50,  6),
            mission("Abre sobres II",       "Abre 25 sobres",   MissionType.OPEN_PACKS,  25,  150, 12),
            mission("Abre sobres III",      "Abre 50 sobres",   MissionType.OPEN_PACKS,  50,  300, 18),
            mission("Abre sobres IV",       "Abre 100 sobres",  MissionType.OPEN_PACKS, 100,  600, 18),

            mission("Primer amigo",         "Añade a 1 amigo",   MissionType.ADD_FRIENDS,  1,   50,  6),
            mission("Pequeño grupo",        "Añade a 3 amigos",  MissionType.ADD_FRIENDS,  3,  100, 12),
            mission("Red social",           "Añade a 10 amigos", MissionType.ADD_FRIENDS, 10,  300, 24),

            mission("Primer trato",         "Completa 1 intercambio",   MissionType.COMPLETE_TRADES,  1,  100, 12),
            mission("Negociador",           "Completa 3 intercambios",  MissionType.COMPLETE_TRADES,  3,  150, 18),
            mission("Mercader",             "Completa 10 intercambios", MissionType.COMPLETE_TRADES, 10,  300, 24),

            mission("Subiendo peldaños",    "Alcanza el nivel 5",  MissionType.REACH_LEVEL,  5,  100,  6),
            mission("Jugador experimentado","Alcanza el nivel 20", MissionType.REACH_LEVEL, 20,  500, 12),
            mission("Leyenda viviente",     "Alcanza el nivel 50", MissionType.REACH_LEVEL, 50, 1000, 24)
        );

        missionRepository.resetAutoIncrement();
        missionRepository.saveAll(missions);
        log.info("Seeded {} missions.", missions.size());
    }

    private Mission mission(String name, String description, MissionType type,
                            int goal, int xp, int points) {
        Mission m = new Mission();
        m.setName(name);
        m.setDescription(description);
        m.setType(type);
        m.setGoal(goal);
        m.setRewardExperience(xp);
        m.setRewardPoints(points);
        return m;
    }
}
