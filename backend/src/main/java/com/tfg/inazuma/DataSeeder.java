package com.tfg.inazuma;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tfg.inazuma.model.Card;
import com.tfg.inazuma.model.CardPackage;
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
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final String WIKI_API     = "https://inazuma.fandom.com/es/api.php";
    private static final int    DELAY_MS     = 80;
    private static final double GO_DIVISOR   = 2.0;
    private static final String IMAGES_DIR   = "static/images/cards/";
    private static final String PLAYERS_FILE = "players.json";
    private static final String CARDS_FILE   = "cards.json";

    private final CardRepository cardRepository;
    private final CardService    cardService;
    private final ObjectMapper   objectMapper = new ObjectMapper();

    private HttpClient httpClient;
    private final Map<String, String> wikitextCache = new HashMap<>();

    // ─── DTOs ─────────────────────────────────────────────────────────────────

    static class PlayerConfig {
        public String page;             // nombre en la wiki española (lo pone el usuario)
        public String team;
        public String nameOverride;     // si se especifica, se usa como nombre de la carta
        public String nickname;         // apodo de la carta
        public String positionOverride; // fuerza una posición concreta (ej: "GK" para portero)
    }

    static class CardData {
        public String scrapeKey;
        public String sourcePage;
        public String name;
        public String nickname;
        public String team;
        public String collection;
        public String cardPackage;
        public String type;
        public String position;
        public int    attack;
        public int    control;
        public int    defense;
        public int    rating;
        public String imageUrl;
    }

    // ─── Configuración por juego ───────────────────────────────────────────────

    private enum GameConfig {
        IE1("IE1", "Inazuma Eleven 1",    "Estadísticas (Jugador / Original)", CardPackage.INAZUMA_ELEVEN,    false),
        IE2("IE2", "Inazuma Eleven 2",    "Estadísticas (Jugador / Original)", CardPackage.INAZUMA_ELEVEN,    false),
        IE3("IE3", "Inazuma Eleven 3",    "Estadísticas (Jugador / Original)", CardPackage.INAZUMA_ELEVEN,    false),
        GO1("GO1", "Inazuma Eleven GO",   "Estadísticas (Jugador / GO)",       CardPackage.INAZUMA_ELEVEN_GO, true),
        GO2("GO2", "Inazuma Eleven GO 2", "Estadísticas (Jugador / GO)",       CardPackage.INAZUMA_ELEVEN_GO, true),
        GO3("GO3", "Inazuma Eleven GO 3", "Estadísticas (Jugador / GO)",       CardPackage.INAZUMA_ELEVEN_GO, true);

        final String configKey, collection, statsTemplate;
        final CardPackage pkg;
        final boolean isGO;

        GameConfig(String configKey, String collection, String statsTemplate, CardPackage pkg, boolean isGO) {
            this.configKey     = configKey;
            this.collection    = collection;
            this.statsTemplate = statsTemplate;
            this.pkg           = pkg;
            this.isGO          = isGO;
        }
    }

    // ─── Entrada principal ─────────────────────────────────────────────────────

    @Override
    public void run(String... args) {
        try {
            this.httpClient = buildHttpClient();
            List<CardData> existingCards = loadCardsJson();
            Set<String> existingKeys = existingCards.stream()
                    .map(c -> c.scrapeKey)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            Map<String, List<PlayerConfig>> playersConfig = loadPlayersConfig();
            List<CardData> newCards = new ArrayList<>();

            for (GameConfig game : GameConfig.values()) {
                List<PlayerConfig> players = playersConfig.getOrDefault(game.configKey, List.of());
                for (PlayerConfig pc : players) {
                    String key = computeScrapeKey(pc, game.collection);
                    if (existingKeys.contains(key)) {
                        log.debug("Skipping already-scraped: {}", key);
                        continue;
                    }
                    log.info("Scraping: {} / {}", pc.page, game.collection);
                    try {
                        CardData card = scrapeCard(pc, game);
                        if (card != null) {
                            newCards.add(card);
                            existingKeys.add(key);
                        } else {
                            log.warn("  No data: {}", key);
                        }
                    } catch (Exception e) {
                        log.warn("  Error {}: {}", key, e.getMessage());
                    }
                }
            }

            List<CardData> allCards = new ArrayList<>(existingCards);
            allCards.addAll(newCards);

            sortByCollection(allCards);

            boolean imagesUpdated = updateMissingImages(allCards);

            if (!newCards.isEmpty() || imagesUpdated) {
                saveCardsJson(allCards);
                log.info("Saved: {} new cards, images updated: {}", newCards.size(), imagesUpdated);
            } else {
                log.info("No changes — {} existing cards", existingCards.size());
            }

            if (!allCards.isEmpty()) {
                syncDatabase(allCards);
            } else {
                log.warn("No cards to sync");
            }
        } catch (Exception e) {
            log.error("Seeder failed: {}", e.getMessage(), e);
        }
        System.exit(0); // temporal: quitar cuando se añada la API REST
    }

    private boolean updateMissingImages(List<CardData> cards) {
        Map<String, List<CardData>> byPage = new LinkedHashMap<>();
        for (CardData card : cards) {
            if (card.imageUrl == null && card.sourcePage != null) {
                byPage.computeIfAbsent(card.sourcePage, k -> new ArrayList<>()).add(card);
            }
        }
        if (byPage.isEmpty()) return false;
        log.info("Fetching images for {} pages with missing imageUrl...", byPage.size());
        boolean updated = false;
        for (Map.Entry<String, List<CardData>> entry : byPage.entrySet()) {
            try {
                String wikitext = getWikitext(entry.getKey());
                if (wikitext == null || wikitext.isBlank()) continue;
                String imageUrl = getImageUrl(wikitext);
                if (imageUrl != null) {
                    entry.getValue().forEach(c -> c.imageUrl = imageUrl);
                    updated = true;
                    log.debug("Image set for {}: {}", entry.getKey(), imageUrl);
                }
            } catch (Exception e) {
                log.warn("Could not get image for {}: {}", entry.getKey(), e.getMessage());
            }
        }
        return updated;
    }

    private String computeScrapeKey(PlayerConfig pc, String collection) {
        String name = pc.nameOverride != null ? pc.nameOverride : pc.page;
        String pos  = pc.positionOverride != null ? pc.positionOverride : "";
        return name + "|" + collection + "|" + (pc.team != null ? pc.team : "") + "|" + pos;
    }

    private void sortByCollection(List<CardData> cards) {
        Map<String, Integer> order = new LinkedHashMap<>();
        for (GameConfig g : GameConfig.values()) {
            order.put(g.collection, order.size());
        }
        cards.sort(Comparator.comparingInt(c -> order.getOrDefault(c.collection, 99)));
    }

    // ─── Ficheros ──────────────────────────────────────────────────────────────

    private Map<String, List<PlayerConfig>> loadPlayersConfig() throws Exception {
        Path path = Path.of(PLAYERS_FILE);
        if (!Files.exists(path)) {
            log.warn("players.json not found — nothing to scrape");
            return Map.of();
        }
        return objectMapper.readValue(path.toFile(),
                new TypeReference<Map<String, List<PlayerConfig>>>() {});
    }

    private List<CardData> loadCardsJson() {
        Path path = Path.of(CARDS_FILE);
        if (!Files.exists(path)) return new ArrayList<>();
        try {
            return objectMapper.readValue(path.toFile(),
                    new TypeReference<List<CardData>>() {});
        } catch (Exception e) {
            log.warn("Could not read cards.json: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private void saveCardsJson(List<CardData> cards) throws Exception {
        objectMapper.writerWithDefaultPrettyPrinter()
                .writeValue(Path.of(CARDS_FILE).toFile(), cards);
    }

    // ─── Sincronización con la BD ──────────────────────────────────────────────

    private void syncDatabase(List<CardData> cardDataList) {
        log.info("Syncing {} cards with database...", cardDataList.size());
        cardRepository.truncate();
        cardRepository.resetAutoIncrement();
        List<Card> entities = cardDataList.stream()
                .map(this::toEntity)
                .filter(Objects::nonNull)
                .toList();
        cardRepository.saveAll(entities);
        log.info("Database synced: {} cards saved", entities.size());
    }

    private Card toEntity(CardData data) {
        try {
            Card card = new Card();
            card.setName(data.name);
            card.setNickname(data.nickname);
            card.setTeam(data.team);
            card.setCollection(data.collection);
            card.setCardPackage(data.cardPackage != null ? CardPackage.valueOf(data.cardPackage) : null);
            card.setType(data.type != null ? CardType.valueOf(data.type) : CardType.NORMAL);
            card.setPosition(data.position);
            card.setAttack(data.attack);
            card.setControl(data.control);
            card.setDefense(data.defense);
            card.setImageUrl(data.imageUrl);
            return card;
        } catch (Exception e) {
            log.warn("Could not convert card data for '{}': {}", data.name, e.getMessage());
            return null;
        }
    }

    // ─── Scraping ──────────────────────────────────────────────────────────────

    private CardData scrapeCard(PlayerConfig pc, GameConfig game) throws Exception {
        String wikitext = getWikitext(pc.page);
        if (wikitext == null || wikitext.isBlank()) {
            log.warn("  No wikitext found for '{}'", pc.page);
            return null;
        }

        String position      = extractPosition(wikitext);
        String finalPosition = pc.positionOverride != null ? pc.positionOverride : position;

        PlayerStats stats = extractStats(wikitext, game.statsTemplate, game.isGO);
        if (stats == null) {
            log.warn("  No stats found for '{}' in {}", pc.page, game.collection);
            return null;
        }

        CardData card    = new CardData();
        card.scrapeKey   = computeScrapeKey(pc, game.collection);
        card.sourcePage  = pc.page;
        card.name        = pc.nameOverride != null ? pc.nameOverride : pc.page;
        card.nickname    = pc.nickname;
        card.team        = pc.team;
        card.collection  = game.collection;
        card.cardPackage = game.pkg.name();
        card.type        = CardType.NORMAL.name();
        card.position    = finalPosition;
        card.attack      = stats.attack();
        card.control     = stats.control();
        card.defense     = stats.defense();
        card.rating      = Card.computeRating(finalPosition, stats.attack(), stats.control(), stats.defense());
        card.imageUrl    = getImageUrl(wikitext);
        return card;
    }

    // ─── Extracción de campos ──────────────────────────────────────────────────

    private String extractPosition(String wikitext) {
        int posField = wikitext.indexOf("|Posición =");
        if (posField == -1) posField = wikitext.indexOf("|Posición=");
        if (posField == -1) return null;

        String region = wikitext.substring(posField, Math.min(posField + 500, wikitext.length()));
        Pattern p = Pattern.compile("\\{\\{Posición/([A-Za-z]+)\\}\\}");
        Matcher m = p.matcher(region);
        if (!m.find()) return null;

        return switch (m.group(1).toUpperCase()) {
            case "PR"                                        -> "GK";
            case "DL", "EXT", "EI", "ED"                    -> "FW";
            case "MC", "MI", "MP", "MO", "MD", "MDC", "MOC"  -> "MF";
            case "DF", "DC", "LB", "LD", "LI", "LP", "CAR" -> "DF";
            default                                         -> null;
        };
    }

    // ─── Stats ─────────────────────────────────────────────────────────────────

    private record PlayerStats(int attack, int control, int defense) {}

    private PlayerStats extractStats(String wikitext, String templateName, boolean isGO) {
        // Robust match: optional "Plantilla:" prefix, optional soft-hyphen U+00AD inside
        // "Estadísticas", flexible whitespace around "/", case-insensitive.
        // í = í (U+00ED), ­ = soft hyphen (U+00AD).
        String gameType = isGO ? "GO" : "Original";
        Pattern tplPat = Pattern.compile(
                "\\{\\{(?:Plantilla:)?[Ee]stad[­]?ísticas\\s*"
                + "\\(\\s*Jugador\\s*/\\s*" + Pattern.quote(gameType) + "\\s*\\)");
        Matcher tplMatcher = tplPat.matcher(wikitext);
        if (!tplMatcher.find()) return null;
        int start = tplMatcher.start();

        // Encuentra el cierre de la plantilla respetando plantillas anidadas
        int depth = 0, end = wikitext.length();
        for (int i = start; i < wikitext.length() - 1; i++) {
            if (wikitext.charAt(i) == '{' && wikitext.charAt(i + 1) == '{') { depth++; i++; }
            else if (wikitext.charAt(i) == '}' && wikitext.charAt(i + 1) == '}') {
                if (--depth == 0) { end = i + 2; break; }
                i++;
            }
        }
        String block = wikitext.substring(start, end);

        int tiro    = extractStat(block, "Tiro");
        int control = extractStat(block, "Control");
        int defensa = extractStat(block, "Defensa");

        if (tiro < 0 || control < 0 || defensa < 0) return null;

        if (isGO) {
            return new PlayerStats(
                    normalize(tiro,    GO_DIVISOR),
                    normalize(control, GO_DIVISOR),
                    normalize(defensa, GO_DIVISOR)
            );
        }
        return new PlayerStats(clamp(tiro), clamp(control), clamp(defensa));
    }

    private int extractStat(String text, String statName) {
        Pattern p = Pattern.compile("\\|\\s*" + Pattern.quote(statName) + "\\s*=\\s*(\\d+)");
        Matcher m = p.matcher(text);
        return m.find() ? Integer.parseInt(m.group(1)) : -1;
    }

    // ─── Imágenes ──────────────────────────────────────────────────────────────

    private String extractImageFilename(String wikitext) {
        int idx = wikitext.indexOf("|Imagen");
        if (idx == -1) idx = wikitext.indexOf("|imagen");
        if (idx == -1) return null;

        String region = wikitext.substring(idx, Math.min(idx + 1000, wikitext.length()));
        Pattern p = Pattern.compile("([\\w()\\-. ]+\\.(?:png|jpg|jpeg|gif))", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(region);
        return m.find() ? m.group(1).trim() : null;
    }

    private String fetchImageUrl(String filename) throws Exception {
        String url = WIKI_API + "?action=query&titles=File:"
                + URLEncoder.encode(filename, StandardCharsets.UTF_8)
                + "&prop=imageinfo&iiprop=url&format=json";
        String json = fetch(url);
        JsonNode pages = objectMapper.readTree(json).path("query").path("pages");
        JsonNode page  = pages.fields().next().getValue();
        JsonNode info  = page.path("imageinfo");
        if (!info.isArray() || info.isEmpty()) return null;
        return info.get(0).path("url").asText(null);
    }

    private String getImageUrl(String wikitext) {
        try {
            String filename = extractImageFilename(wikitext);
            if (filename == null) return null;
            String remoteUrl = fetchImageUrl(filename);
            Thread.sleep(DELAY_MS);
            if (remoteUrl == null) return null;
            return downloadAndSaveImage(remoteUrl, filename);
        } catch (Exception e) {
            return null;
        }
    }

    private String downloadAndSaveImage(String remoteUrl, String wikiFilename) {
        try {
            String sanitized = wikiFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
            Path dir      = Path.of(IMAGES_DIR);
            Files.createDirectories(dir);
            Path filePath = dir.resolve(sanitized);

            if (!Files.exists(filePath)) {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(remoteUrl))
                        .header("User-Agent", "InazumaTFG/1.0 (TFG educativo)")
                        .timeout(Duration.ofSeconds(15))
                        .build();
                httpClient.send(request, HttpResponse.BodyHandlers.ofFile(filePath));
                Thread.sleep(DELAY_MS);
            }

            return "/images/cards/" + sanitized;
        } catch (Exception e) {
            log.debug("Could not download image {}: {}", wikiFilename, e.getMessage());
            return null;
        }
    }

    // ─── HTTP con caché ────────────────────────────────────────────────────────

    private String getWikitext(String pageName) throws Exception {
        if (wikitextCache.containsKey(pageName)) {
            return wikitextCache.get(pageName);
        }
        String wikitext = fetchWikitext(pageName);
        wikitextCache.put(pageName, wikitext != null ? wikitext : "");
        Thread.sleep(DELAY_MS);
        return wikitext;
    }

    private String fetchWikitext(String pageName) throws Exception {
        String url = WIKI_API + "?action=parse&page="
                + URLEncoder.encode(pageName, StandardCharsets.UTF_8)
                + "&prop=wikitext&format=json";
        String json = fetch(url);
        JsonNode node = objectMapper.readTree(json);
        if (node.has("error")) return null;
        return node.path("parse").path("wikitext").path("*").asText();
    }

    private String fetch(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "InazumaTFG/1.0 (TFG educativo)")
                .timeout(Duration.ofSeconds(10))
                .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).body();
    }

    // ─── Utilidades ────────────────────────────────────────────────────────────

    private int normalize(int value, double divisor) {
        return clamp((int) Math.round(value / divisor));
    }

    private int clamp(int value) {
        return Math.max(0, Math.min(99, value));
    }

    private HttpClient buildHttpClient() throws Exception {
        HttpClient.Builder builder = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10));
        if (System.getProperty("os.name", "").toLowerCase().contains("win")) {
            KeyStore windowsStore = KeyStore.getInstance("Windows-ROOT");
            windowsStore.load(null, null);
            TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            tmf.init(windowsStore);
            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, tmf.getTrustManagers(), null);
            builder.sslContext(sslContext);
        }
        return builder.build();
    }
}
