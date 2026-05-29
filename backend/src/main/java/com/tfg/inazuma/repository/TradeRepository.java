package com.tfg.inazuma.repository;

import com.tfg.inazuma.model.Person;
import com.tfg.inazuma.model.Trade;
import com.tfg.inazuma.model.TradeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TradeRepository extends JpaRepository<Trade, Long> {

    @Query("SELECT t FROM Trade t WHERE (t.initiator = :person OR t.receiver = :person) AND t.status IN (:statuses)")
    List<Trade> findActiveByPerson(@Param("person") Person person,
                                   @Param("statuses") List<TradeStatus> statuses);

    List<Trade> findByInitiatorOrReceiverOrderByDateDesc(Person initiator, Person receiver);

    /** Todos los intercambios activos globalmente (para calcular qué personas están ocupadas). */
    @Query("SELECT t FROM Trade t WHERE t.status IN (:statuses)")
    List<Trade> findAllActive(@Param("statuses") List<TradeStatus> statuses);
}
