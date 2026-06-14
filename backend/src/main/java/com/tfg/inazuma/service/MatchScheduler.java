package com.tfg.inazuma.service;

import com.tfg.inazuma.model.MatchStatus;
import com.tfg.inazuma.model.MatchTurn;
import com.tfg.inazuma.repository.MatchRepository;
import com.tfg.inazuma.repository.MatchTurnRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class MatchScheduler {

    private static final long TURN_TIMEOUT_SECONDS       = 60;
    private static final long DISCONNECT_TIMEOUT_SECONDS = 60;

    private final MatchService        matchService;
    private final MatchRepository     matchRepo;
    private final MatchTurnRepository turnRepo;

    @Scheduled(fixedDelay = 5_000)
    public void checkTurnTimeouts() {
        try {
            List<MatchTurn> pending = turnRepo.findAllPendingInProgressTurns();
            for (MatchTurn turn : pending) {
                matchService.autoMoveIfTimeout(turn, TURN_TIMEOUT_SECONDS);
            }
        } catch (Exception e) {
            log.error("Error en checkTurnTimeouts: {}", e.getMessage(), e);
        }
    }

    @Scheduled(fixedDelay = 10_000)
    public void checkDisconnects() {
        try {
            matchRepo.findAllByStatus(MatchStatus.IN_PROGRESS)
                    .forEach(m -> matchService.checkDisconnectForMatch(m, DISCONNECT_TIMEOUT_SECONDS));
        } catch (Exception e) {
            log.error("Error en checkDisconnects: {}", e.getMessage(), e);
        }
    }
}
