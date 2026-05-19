package com.tfg.inazuma;

import com.tfg.inazuma.model.Card;
import com.tfg.inazuma.model.CardType;
import com.tfg.inazuma.repository.CardRepository;
import com.tfg.inazuma.service.CardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final String PLAYERS_JS_URL =
            "https://raw.githubusercontent.com/realt0w/inazuma-index/main/js/players.js";
    private static final String SPRITE_BASE_URL =
            "https://raw.githubusercontent.com/realt0w/inazuma-index/main/";

    private static final Map<String, String> COLLECTION_NAMES = Map.of(
            "IE1", "Inazuma Eleven 1",
            "IE2", "Inazuma Eleven 2",
            "IE3", "Inazuma Eleven 3",
            "GO1", "Inazuma Eleven GO",
            "GO2", "Inazuma Eleven GO 2",
            "GO3", "Inazuma Eleven GO 3"
    );

    private final CardRepository cardRepository;
    private final CardService cardService;

    @Override
    public void run(String... args) {
        if (cardRepository.count() > 0) {
            log.info("Cards already seeded, skipping.");
            return;
        }

        try {
            log.info("Fetching player data from inazuma-index...");
            String content = fetchContent(PLAYERS_JS_URL);
            List<Card> cards = parseCards(content);
            cardRepository.saveAll(cards);
            log.info("Seeded {} cards", cards.size());
        } catch (Exception e) {
            log.error("Could not seed card data: {}", e.getMessage());
        }
    }

    private String fetchContent(String url) throws Exception {
        HttpClient client = buildHttpClient();
        HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return response.body();
    }

    // En Windows, el JDK no incluye todos los certificados raíz de forma nativa,
    // por lo que usamos el almacén de Windows para que funcione HTTPS a GitHub.
    private HttpClient buildHttpClient() throws Exception {
        if (System.getProperty("os.name", "").toLowerCase().contains("win")) {
            KeyStore windowsStore = KeyStore.getInstance("Windows-ROOT");
            windowsStore.load(null, null);
            TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            tmf.init(windowsStore);
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, tmf.getTrustManagers(), null);
            return HttpClient.newBuilder().sslContext(sslContext).build();
        }
        return HttpClient.newHttpClient();
    }

    private List<Card> parseCards(String content) {
        List<Card> cards = new ArrayList<>();
        Pattern blockPattern = Pattern.compile("\\{([^{}]+)}", Pattern.DOTALL);
        Matcher matcher = blockPattern.matcher(content);

        while (matcher.find()) {
            try {
                Card card = parseCard(matcher.group());
                if (card != null) cards.add(card);
            } catch (Exception e) {
                log.debug("Skipping malformed player block: {}", e.getMessage());
            }
        }
        return cards;
    }

    private Card parseCard(String block) {
        String name = extractString(block, "Name");
        if (name == null || name.isBlank()) return null;

        Integer kick    = extractInt(block, "Kick");
        Integer control = extractInt(block, "Control");
        Integer guard   = extractInt(block, "Guard");
        if (kick == null || control == null || guard == null) return null;

        String position   = extractImageField(block, "Position");
        String gameCode   = extractString(block, "Game");
        int a = clamp(kick);
        int c = clamp(control);
        int d = clamp(guard);

        Card card = new Card();
        card.setName(name);
        card.setCollection(COLLECTION_NAMES.getOrDefault(gameCode, gameCode));
        card.setType(CardType.NORMAL);
        card.setPosition(position);
        card.setAttack(a);
        card.setControl(c);
        card.setDefense(d);
        card.setRating(cardService.calculateRating(position, a, c, d));

        return card;
    }

    private int clamp(int value) {
        return Math.max(0, Math.min(99, value));
    }

    private String extractString(String block, String key) {
        Pattern p = Pattern.compile("\"" + key + "\":\\s*\"(.*?)\"");
        Matcher m = p.matcher(block);
        return m.find() ? m.group(1) : null;
    }

    private Integer extractInt(String block, String key) {
        Pattern p = Pattern.compile("\"" + key + "\":\\s*(\\d+)");
        Matcher m = p.matcher(block);
        return m.find() ? Integer.parseInt(m.group(1)) : null;
    }

    private String extractImageField(String block, String key) {
        Pattern p = Pattern.compile("\"" + key + "\":\\s*\"[^\"]*/(\\w+)\\.png\"");
        Matcher m = p.matcher(block);
        return m.find() ? m.group(1) : null;
    }
}
