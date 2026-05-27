import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../../components/AppHeader';
import { CardCell, CARD_ASPECT } from '../../components/CardCell';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../../constants/api';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { apiGetFullCollection } from '../../services/collectionService';
import { CardData, CollectionEntry } from '../../types/collection';

// ── Dimensiones ───────────────────────────────────────────────────────────────
const NUM_COLS = 4;
const H_PAD    = 12;
const GAP      = 4;
const SCREEN_W = Dimensions.get('window').width;
const CELL_W   = (SCREEN_W - H_PAD * 2 - GAP * (NUM_COLS - 1)) / NUM_COLS;
const CELL_H   = Math.round(CELL_W * 1.5);

// ── Traducciones ──────────────────────────────────────────────────────────────
const RARITY: Record<string, string>   = { NORMAL: 'Común', LEGEND: 'Leyenda' };
const POSITION: Record<string, string> = {
  POR: 'Portero', DF: 'Defensa', MC: 'Centrocampista', DC: 'Delantero',
};

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function CollectionScreen() {
  const router        = useRouter();
  const { user }      = useAuth();
  const [entries,     setEntries]     = useState<CollectionEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [selected,    setSelected]    = useState<{ entry: CollectionEntry; number: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Mapa cardId → número global en la colección completa
  const numberMap = useMemo(() => {
    const map = new Map<number, number>();
    entries.forEach((e, i) => map.set(e.card.id, i + 1));
    return map;
  }, [entries]);

  // Resultados de búsqueda sobre TODAS las cartas (incluidas no poseídas)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return entries.filter(e => e.card.name.toLowerCase().includes(q));
  }, [entries, searchQuery]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiGetFullCollection(user.id)
      .then(setEntries)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!user) return null;

  const avatarUri = user.profilePhoto
    ? { uri: `${BASE_URL}${user.profilePhoto}` }
    : { uri: `${BASE_URL}/images/default_profile.png` };

  const ie1 = entries.filter(e => e.card.cardPackage === 'INAZUMA_ELEVEN');
  const ie2 = entries.filter(e => e.card.cardPackage === 'INAZUMA_ELEVEN_GO');

  return (
    <SafeAreaView style={styles.root}>
      <AppHeader avatarSize={46} />

      {/* Barra de búsqueda */}
      {!loading && !error && (
        <View style={styles.searchBarWrap}>
          <Ionicons name="search" size={16} color={Colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar carta por nombre..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={Colors.textLight} />
            </Pressable>
          )}
        </View>
      )}

      {/* Contenido */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.textLight} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : searchResults !== null ? (
        /* ── Resultados de búsqueda ── */
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.searchCount}>
            {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
          </Text>
          <View style={styles.grid}>
            {searchResults.map(entry => (
              <CardCell
                key={entry.card.id}
                card={entry.card}
                owned={entry.owned}
                quantity={entry.quantity}
                cardNumber={numberMap.get(entry.card.id)}
                width={CELL_W}
                onPress={() => setSelected({
                  entry,
                  number: numberMap.get(entry.card.id) ?? 0,
                })}
              />
            ))}
            {Array.from({
              length: (NUM_COLS - (searchResults.length % NUM_COLS)) % NUM_COLS,
            }).map((_, i) => (
              <View key={`sf-${i}`} style={styles.cellFiller} />
            ))}
          </View>
        </ScrollView>
      ) : (
        /* ── Vista normal por secciones ── */
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SectionHeader
            title="Inazuma Eleven"
            owned={ie1.filter(e => e.owned).length}
            total={ie1.length}
          />
          <CardGrid
            entries={ie1}
            startIndex={0}
            onPress={(entry, number) => setSelected({ entry, number })}
          />
          <SectionHeader
            title="Inazuma Eleven GO"
            owned={ie2.filter(e => e.owned).length}
            total={ie2.length}
          />
          <CardGrid
            entries={ie2}
            startIndex={ie1.length}
            onPress={(entry, number) => setSelected({ entry, number })}
          />
          <View style={{ height: 16 }} />
        </ScrollView>
      )}

      {/* Modal de detalle */}
      {selected && (
        <CardDetailModal
          entry={selected.entry}
          number={selected.number}
          onClose={() => setSelected(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, owned, total }: { title: string; owned: number; total: number }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLine} />
      <View style={styles.sectionTitleWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{owned}/{total}</Text>
      </View>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ── Grid ───────────────────────────────────────────────────────────────────────
function CardGrid({
  entries, startIndex, onPress,
}: {
  entries: CollectionEntry[];
  startIndex: number;
  onPress: (entry: CollectionEntry, number: number) => void;
}) {
  const remainder = entries.length % NUM_COLS;
  const fillers   = remainder === 0 ? 0 : NUM_COLS - remainder;

  return (
    <View style={styles.grid}>
      {entries.map((entry, i) => (
        <CardCell
          key={entry.card.id}
          card={entry.card}
          owned={entry.owned}
          quantity={entry.quantity}
          cardNumber={startIndex + i + 1}
          width={CELL_W}
          onPress={() => onPress(entry, startIndex + i + 1)}
        />
      ))}
      {Array.from({ length: fillers }).map((_, i) => (
        <View key={`filler-${i}`} style={styles.cellFiller} />
      ))}
    </View>
  );
}

// CardCell viene de components/CardCell.tsx (compartido)

// ── Modal detalle ──────────────────────────────────────────────────────────────
function CardDetailModal({
  entry, number, onClose,
}: {
  entry: CollectionEntry;
  number: number;
  onClose: () => void;
}) {
  const { card, owned, quantity } = entry;
  const numStr   = String(number).padStart(3, '0');
  const isLegend = card.type === 'LEGEND';
  const hasImage = owned && card.imageUrl;

  const IMG_W = SCREEN_W * 0.42;
  const IMG_H = IMG_W * 1.45;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.detailRoot}>
        <AppHeader avatarSize={46} />

        <ScrollView
          contentContainerStyle={styles.detailScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Imagen con badge de rating */}
          <View style={[styles.detailImgWrap, { width: IMG_W, height: IMG_H }]}>
            {hasImage ? (
              <>
                <View style={[styles.ratingBadge, isLegend && styles.ratingBadgeLegend, styles.ratingBadgeLg]}>
                  <Text style={styles.ratingTextLg}>{card.rating}</Text>
                </View>
                <Image
                  source={{ uri: `${BASE_URL}${card.imageUrl}` }}
                  style={{ width: IMG_W, height: IMG_H }}
                  resizeMode="contain"
                />
              </>
            ) : (
              <View style={styles.detailNoImg}>
                <Text style={styles.detailNoImgNum}>{numStr}</Text>
              </View>
            )}
          </View>

          {/* Stats grandes */}
          {owned && (
            <View style={styles.detailStatsRow}>
              <StatChipLg label="ATQ" value={card.attack}  bg={ATQ_COLOR} />
              <StatChipLg label="CTL" value={card.control} bg={CTL_COLOR} />
              <StatChipLg label="DEF" value={card.defense} bg={DEF_COLOR} />
            </View>
          )}

          {/* Badge cantidad */}
          <View style={styles.quantityPill}>
            <Text style={styles.quantityPillText}>
              Cantidad de esta carta obtenida:{' '}
              <Text style={{ fontWeight: '800' }}>{quantity}</Text>
            </Text>
          </View>

          {/* Tarjeta de detalles */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Detalles</Text>
            <DetailRow label="Nombre"     value={card.name} />
            <DetailRow label="Colección"  value={card.collection ?? '—'} />
            <DetailRow label="Rareza"     value={RARITY[card.type] ?? card.type} />
            <DetailRow label="Posición"   value={card.position ? POSITION[card.position] ?? card.position : '—'} />
            <DetailRow label="Media"      value={String(card.rating)} />
            <DetailRow label="Ataque"     value={String(card.attack)} />
            <DetailRow label="Control"    value={String(card.control)} />
            <DetailRow label="Defensa"    value={String(card.defense)} />
          </View>

          {/* Botón volver */}
          <Pressable style={styles.backBtn} onPress={onClose}>
            <Text style={styles.backBtnText}>Volver</Text>
          </Pressable>

          <View style={{ height: 16 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function StatChipLg({ label, value, bg }: { label: string; value: number; bg: string }) {
  return (
    <View style={[styles.statChipLg, { backgroundColor: bg }]}>
      <Text style={styles.statChipLgLabel}>{label}</Text>
      <Text style={styles.statChipLgValue}>{value}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}: </Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ── Colores stats ──────────────────────────────────────────────────────────────
const ATQ_COLOR = '#E53935';
const CTL_COLOR = '#1565C0';
const DEF_COLOR = '#2E7D32';

// ── Estilos ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  iconBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatar:      { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: Colors.primary },
  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryLight, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  pointsText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  // Búsqueda
  searchBarWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: H_PAD, marginTop: 10, marginBottom: 4,
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 10, paddingVertical: 8, gap: 8,
  },
  searchIcon:  {},
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark, padding: 0 },
  searchCount: {
    fontSize: 12, fontWeight: '700', color: Colors.textLight,
    paddingHorizontal: H_PAD, paddingTop: 8, paddingBottom: 4,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },

  // Layout
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 14, color: Colors.textLight, textAlign: 'center' },
  scroll:    { paddingTop: 8 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: H_PAD, marginTop: 16, marginBottom: 10, gap: 8,
  },
  sectionLine:      { flex: 1, height: 1, backgroundColor: Colors.border },
  sectionTitleWrap: { alignItems: 'center', gap: 2 },
  sectionTitle:     { fontSize: 13, fontWeight: '800', color: Colors.textDark, letterSpacing: 0.5 },
  sectionCount:     { fontSize: 11, color: Colors.textLight },

  // Grid
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: H_PAD },
  cellFiller: { width: CELL_W, height: CELL_H },

  // Celda — estilos movidos a components/CardCell.tsx

  // ── Modal de detalle ───────────────────────────────────────────────────────
  detailRoot:   { flex: 1, backgroundColor: Colors.background },
  detailScroll: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, gap: 16 },

  // Imagen en detalle
  detailImgWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  detailNoImg: {
    flex: 1, width: '100%', backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', borderRadius: 10,
  },
  detailNoImgNum: { fontSize: 28, fontWeight: '700', color: Colors.border },

  // Rating badge grande
  ratingBadgeLg: { top: 4, left: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  ratingTextLg:  { fontSize: 13, fontWeight: '900', color: '#fff' },

  // Stats grandes
  detailStatsRow: { flexDirection: 'row', gap: 10 },
  statChipLg: {
    flex: 1, alignItems: 'center', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 4, gap: 2,
  },
  statChipLgLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  statChipLgValue: { fontSize: 20, fontWeight: '900', color: '#fff' },

  // Pill de cantidad
  quantityPill: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: Colors.surface,
  },
  quantityPillText: { fontSize: 13, color: Colors.textMid },

  // Tarjeta detalles
  detailCard: {
    width: '100%', backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 16, gap: 6,
  },
  detailCardTitle: {
    fontSize: 16, fontWeight: '800', fontStyle: 'italic',
    color: Colors.textDark, textAlign: 'center', marginBottom: 4,
  },
  detailRow:   { flexDirection: 'row', flexWrap: 'wrap' },
  detailLabel: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  detailValue: { fontSize: 14, color: Colors.textMid, flex: 1 },

  // Botón volver
  backBtn: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 24,
    paddingHorizontal: 40, paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textDark },
});
