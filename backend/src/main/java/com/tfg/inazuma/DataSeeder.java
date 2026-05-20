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

    private static final String WIKI_API     = "https://inazuma-eleven.fandom.com/api.php";
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
        public String page;             // nombre doblado (lo pone el usuario)
        public String wikiPage;         // página canónica de la wiki (se rellena automáticamente)
        public String team;
        public String nameOverride;     // si se especifica, se usa como nombre de la carta
        public String nickname;         // apodo de la carta
        public String positionOverride; // fuerza una posición concreta (ej: "DF" para libero)
    }

    // Fuente de verdad persistida en cards.json
    static class CardData {
        public String scrapeKey;    // clave de deduplicación (se calcula al raspar)
        public String sourcePage;   // nombre de la página wiki
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
        IE1("IE1", "Inazuma Eleven 1",    "Inazuma Eleven",                    CardPackage.INAZUMA_ELEVEN,    false),
        IE2("IE2", "Inazuma Eleven 2",    "Inazuma Eleven 2",                  CardPackage.INAZUMA_ELEVEN,    false),
        IE3("IE3", "Inazuma Eleven 3",    "Inazuma Eleven 3",                  CardPackage.INAZUMA_ELEVEN,    false),
        GO1("GO1", "Inazuma Eleven GO",   "Inazuma Eleven GO",                 CardPackage.INAZUMA_ELEVEN_GO, true),
        GO2("GO2", "Inazuma Eleven GO 2", "Inazuma Eleven GO 2: Chrono Stone", CardPackage.INAZUMA_ELEVEN_GO, true),
        GO3("GO3", "Inazuma Eleven GO 3", "Inazuma Eleven GO 3: Galaxy",       CardPackage.INAZUMA_ELEVEN_GO, true);

        final String configKey, collection, wikiSection;
        final CardPackage pkg;
        final boolean isGO;

        GameConfig(String configKey, String collection, String wikiSection, CardPackage pkg, boolean isGO) {
            this.configKey   = configKey;
            this.collection  = collection;
            this.wikiSection = wikiSection;
            this.pkg         = pkg;
            this.isGO        = isGO;
        }
    }

    // ─── Entrada principal ─────────────────────────────────────────────────────

    @Override
    public void run(String... args) {
        try {
            this.httpClient = buildHttpClient();

            Map<String, List<PlayerConfig>> playersConfig = loadPlayersConfig();
            List<CardData> existingCards = loadCardsJson();

            Set<String> scraped = existingCards.stream()
                    .map(c -> c.scrapeKey != null
                            ? c.scrapeKey
                            : c.sourcePage + "|" + c.collection + "|" + (c.team != null ? c.team : "") + "|")
                    .collect(Collectors.toSet());

            List<CardData> allCards = new ArrayList<>(existingCards);
            boolean changed = false;

            for (GameConfig game : GameConfig.values()) {
                List<PlayerConfig> players = playersConfig.getOrDefault(game.configKey, List.of());
                if (players.isEmpty()) continue;

                log.info("Processing {} ({} players)...", game.collection, players.size());

                boolean playersJsonUpdated = false;
                for (PlayerConfig pc : players) {
                    String key = computeScrapeKey(pc, game.collection);
                    if (scraped.contains(key)) {
                        log.debug("  Skipping {} (already in cards.json)", pc.page);
                        continue;
                    }
                    try {
                        String prevWikiPage = pc.wikiPage;
                        CardData card = scrapeCard(pc, game);
                        if (card != null) {
                            allCards.add(card);
                            scraped.add(key);
                            changed = true;
                            if (!Objects.equals(prevWikiPage, pc.wikiPage)) playersJsonUpdated = true;
                            log.info("  Scraped: {} → {} ({})", pc.page, card.name, card.position);
                        } else {
                            log.warn("  No data found for {} in {}", pc.page, game.collection);
                        }
                    } catch (Exception e) {
                        log.warn("  Failed {}: {}", pc.page, e.getMessage());
                    }
                }
                if (playersJsonUpdated) {
                    savePlayersConfig(playersConfig);
                }
            }

            if (changed) {
                saveCardsJson(allCards);
                log.info("cards.json updated ({} total cards)", allCards.size());
            }

            syncDatabase(allCards);

        } catch (Exception e) {
            log.error("Seeder failed: {}", e.getMessage(), e);
        }
        System.exit(0); // temporal: quitar cuando se añada la API REST
    }

    private String computeScrapeKey(PlayerConfig pc, String collection) {
        String name = pc.nameOverride != null ? pc.nameOverride : pc.page;
        String pos  = pc.positionOverride != null ? pc.positionOverride : "";
        return name + "|" + collection + "|" + (pc.team != null ? pc.team : "") + "|" + pos;
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

    private void savePlayersConfig(Map<String, List<PlayerConfig>> config) throws Exception {
        objectMapper.writerWithDefaultPrettyPrinter()
                .writeValue(Path.of(PLAYERS_FILE).toFile(), config);
    }

    // ─── Sincronización con la BD ──────────────────────────────────────────────

    private void syncDatabase(List<CardData> cardDataList) {
        log.info("Syncing {} cards with database...", cardDataList.size());
        cardRepository.truncate();
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
            card.setRating(data.rating);
            card.setImageUrl(data.imageUrl);
            return card;
        } catch (Exception e) {
            log.warn("Could not convert card data for '{}': {}", data.name, e.getMessage());
            return null;
        }
    }

    // ─── Scraping ──────────────────────────────────────────────────────────────

    private CardData scrapeCard(PlayerConfig pc, GameConfig game) throws Exception {
        // Usa la página ya resuelta si existe, si no prueba el nombre en inglés
        String page = pc.wikiPage != null ? pc.wikiPage : pc.page;
        String wikitext = getWikitext(page);

        String position = wikitext != null ? extractPosition(wikitext) : null;
        PlayerStats stats = (wikitext != null && !wikitext.isBlank())
                ? extractStats(wikitext, game.wikiSection, game.isGO, position)
                : null;

        // Si no hay stats, busca la página canónica (nombre japonés) en la wiki
        if (stats == null) {
            log.debug("  '{}' sin stats directas, buscando en wiki...", page);
            String resolved = searchForWikiPage(pc.page, game.wikiSection);
            if (resolved == null) return null;
            pc.wikiPage = resolved;
            wikitext    = getWikitext(resolved);
            if (wikitext == null || wikitext.isBlank()) return null;
            position = extractPosition(wikitext);
            stats    = extractStats(wikitext, game.wikiSection, game.isGO,
                        pc.positionOverride != null ? pc.positionOverride : position);
            if (stats == null) return null;
        } else if (pc.wikiPage == null) {
            pc.wikiPage = page;
        }

        // positionOverride tiene prioridad sobre la posición extraída de la wiki
        String finalPosition = pc.positionOverride != null ? pc.positionOverride : position;

        CardData card    = new CardData();
        card.scrapeKey   = computeScrapeKey(pc, game.collection);
        card.sourcePage  = pc.page;
        card.name        = pc.nameOverride != null ? pc.nameOverride : extractDubName(wikitext, pc.page);
        card.nickname    = pc.nickname;
        card.team        = pc.team;
        card.collection  = game.collection;
        card.cardPackage = game.pkg.name();
        card.type        = CardType.NORMAL.name();
        card.position    = finalPosition;
        card.attack      = stats.attack();
        card.control     = stats.control();
        card.defense     = stats.defense();
        card.rating      = cardService.calculateRating(finalPosition, stats.attack(), stats.control(), stats.defense());
        card.imageUrl    = getImageUrl(wikitext);
        return card;
    }

    /** Busca en la wiki el artículo que tiene la sección de stats para el juego dado */
    private String searchForWikiPage(String name, String gameSection) throws Exception {
        String url = WIKI_API + "?action=query&list=search&srsearch="
                + URLEncoder.encode(name, StandardCharsets.UTF_8)
                + "&srlimit=5&srnamespace=0&format=json";
        String json = fetch(url);
        Thread.sleep(DELAY_MS);

        JsonNode results = objectMapper.readTree(json).path("query").path("search");
        for (JsonNode result : results) {
            String title    = result.path("title").asText();
            String wikitext = fetchWikitext(title);
            Thread.sleep(DELAY_MS);
            if (wikitext != null && wikitext.contains("|" + gameSection + "|")) {
                log.debug("  Resolved '{}' → '{}'", name, title);
                return title;
            }
        }
        return null;
    }

    // ─── Extracción de campos ──────────────────────────────────────────────────

    private String extractPosition(String wikitext) {
        Pattern p = Pattern.compile("\\|\\s*position\\s*=\\s*([^\\n|<}]+)");
        Matcher m = p.matcher(wikitext);
        if (!m.find()) return null;
        String raw = m.group(1).trim().toLowerCase();
        if (raw.contains("goal"))    return "GK";
        if (raw.contains("forward") || raw.contains("striker")) return "FW";
        if (raw.contains("midf"))   return "MF";
        if (raw.contains("def"))    return "DF";
        return switch (raw) {
            case "gk"                   -> "GK";
            case "fw", "st"             -> "FW";
            case "mf", "cm", "am"       -> "MF";
            case "df", "cb", "lb", "rb" -> "DF";
            default                     -> raw.toUpperCase();
        };
    }

    private String extractDubName(String wikitext, String fallback) {
        Pattern p = Pattern.compile("\\|\\s*name_dub\\s*=\\s*([^\\n|<}]+)");
        Matcher m = p.matcher(wikitext);
        if (!m.find()) return fallback;
        String name = m.group(1).replaceAll("^[*\\s]+", "").trim();
        return name.isEmpty() ? fallback : name;
    }

    // ─── Stats ─────────────────────────────────────────────────────────────────

    private record PlayerStats(int attack, int control, int defense) {}

    private PlayerStats extractStats(String wikitext, String gameSection, boolean isGO, String position) {
        String header = "|" + gameSection + "|";
        int start = wikitext.indexOf(header);
        if (start == -1) return null;

        String section = wikitext.substring(start, Math.min(start + 700, wikitext.length()));

        if (!isGO) {
            int kick    = extractStat(section, "Kick");
            int control = extractStat(section, "Control");
            int guard   = extractStat(section, "Guard");
            if (kick < 0 || control < 0 || guard < 0) return null;
            return new PlayerStats(clamp(kick), clamp(control), clamp(guard));
        }

        int kick      = extractStat(section, "Kick");
        int technique = extractStat(section, "Technique");
        int block     = extractStat(section, "Block");
        int catchStat = extractStat(section, "Catch");
        if (kick < 0 || technique < 0) return null;

        int defense = "GK".equals(position) && catchStat >= 0 ? catchStat : block;
        if (defense < 0) return null;

        return new PlayerStats(
                normalize(kick,      GO_DIVISOR),
                normalize(technique, GO_DIVISOR),
                normalize(defense,   GO_DIVISOR)
        );
    }

    private int extractStat(String text, String statName) {
        Pattern p = Pattern.compile(Pattern.quote(statName) + "[''']*\\s*:\\s*(\\d+)");
        Matcher m = p.matcher(text);
        return m.find() ? Integer.parseInt(m.group(1)) : -1;
    }

    // ─── Imágenes ──────────────────────────────────────────────────────────────

    private String extractImageFilename(String wikitext) {
        Pattern p = Pattern.compile(
                "\\|\\s*image\\s*=\\s*(?:\\[\\[File:)?([^|\\n\\]<}]+\\.(?:png|jpg|jpeg|gif))",
                Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(wikitext);
        if (!m.find()) return null;
        return m.group(1).trim();
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
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString()).body();
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
