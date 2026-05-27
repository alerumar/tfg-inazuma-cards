import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardCell, CARD_ASPECT } from '../components/CardCell';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { apiGetDecks } from '../services/deckService';
import { DeckData } from '../types/decks';

const MAX_DECKS   = 10;
const MAX_CARDS   = 5;
const MAX_LEGENDS = 2;

// Dimensiones de los slots dentro de la tarjeta de baraja:
// scroll padding 16×2 + deckCard padding 14×2 + 4 gaps de 6
const SCREEN_W  = Dimensions.get('window').width;
const SLOT_GAP  = 6;
const SLOT_W    = (SCREEN_W - 16 * 2 - 14 * 2 - SLOT_GAP * (MAX_CARDS - 1)) / MAX_CARDS;
const SLOT_H    = Math.round(SLOT_W * CARD_ASPECT);

// ── Pantalla ──────────────────────────────────────────────────────────────────
export default function DecksScreen() {
  const router   = useRouter();
  const { user } = useAuth();
  const [decks,   setDecks]   = useState<DeckData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDecks = useCallback(() => {
    if (!user) return;
    setLoading(true);
    apiGetDecks(user.id)
      .then(setDecks)
      .catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [user?.id]);

  useFocusEffect(fetchDecks);

  if (!user) return null;

  const deckCount   = decks.length;
  const remaining   = MAX_DECKS - deckCount;
  const progressPct = (deckCount / MAX_DECKS) * 100;
  const atMax       = deckCount >= MAX_DECKS;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={Colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Mis barajas</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Contador de barajas ── */}
          <View style={styles.progressCard}>
            <View style={styles.progressTop}>
              <View style={styles.progressIconWrap}>
                <Ionicons name="layers" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.progressTitle}>Barajas creadas</Text>
                <Text style={styles.progressHint}>
                  {atMax
                    ? '¡Has alcanzado el máximo de barajas!'
                    : `Te ${remaining === 1 ? 'queda' : 'quedan'} ${remaining} baraja${remaining !== 1 ? 's' : ''} disponible${remaining !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countCurrent}>{deckCount}</Text>
                <Text style={styles.countSep}>/</Text>
                <Text style={styles.countMax}>{MAX_DECKS}</Text>
              </View>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${progressPct}%` }, atMax && styles.barFull]} />
            </View>
          </View>

          {/* ── Lista o estado vacío ── */}
          {deckCount === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="layers-outline" size={52} color={Colors.primaryLight} />
              <Text style={styles.emptyTitle}>Aún no tienes barajas</Text>
              <Text style={styles.emptyDesc}>
                Pulsa el botón "+" para crear tu primera baraja
              </Text>
            </View>
          ) : (
            <View style={styles.deckList}>
              {decks.map(deck => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onPress={() => router.push(`/deck/${deck.id}` as any)}
                />
              ))}
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* ── FAB: nueva baraja ── */}
      {!atMax && (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => router.push('/deck/new' as any)}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

// ── Tarjeta de baraja ─────────────────────────────────────────────────────────
function DeckCard({ deck, onPress }: { deck: DeckData; onPress: () => void }) {
  const cardCount   = deck.cards.length;
  const legendCount = deck.cards.filter(e => e.card.type === 'LEGEND').length;
  const slots       = Array.from({ length: MAX_CARDS }, (_, i) => deck.cards[i] ?? null);

  return (
    <Pressable
      style={({ pressed }) => [styles.deckCard, pressed && styles.deckCardPressed]}
      onPress={onPress}
    >
      <View style={styles.deckTop}>
        <View style={styles.deckIconWrap}>
          <Ionicons name="layers" size={22} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.deckName} numberOfLines={1}>{deck.name}</Text>
          <View style={styles.deckMeta}>
            <Text style={styles.deckMetaText}>{cardCount} / {MAX_CARDS} cartas</Text>
            {legendCount > 0 && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.deckMetaText}>
                  {legendCount} / {MAX_LEGENDS} leyenda{legendCount !== 1 ? 's' : ''}
                </Text>
              </>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
      </View>

      <View style={styles.slotsRow}>
        {slots.map((entry, idx) =>
          entry ? (
            <CardCell
              key={idx}
              card={entry.card}
              owned
              width={SLOT_W}
            />
          ) : (
            <View key={idx} style={styles.slotEmpty}>
              <Ionicons name="add" size={18} color={Colors.border} />
            </View>
          )
        )}
      </View>
    </Pressable>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  backBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:      { padding: 16, gap: 14 },

  progressCard:     { backgroundColor: Colors.surface, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12 },
  progressTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  progressTitle:    { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  progressHint:     { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  countBadge:       { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  countCurrent:     { fontSize: 28, fontWeight: '900', color: Colors.primary, lineHeight: 32 },
  countSep:         { fontSize: 16, fontWeight: '700', color: Colors.textLight, lineHeight: 32 },
  countMax:         { fontSize: 16, fontWeight: '700', color: Colors.textLight, lineHeight: 32 },
  barBg:            { height: 8, backgroundColor: Colors.primaryLight, borderRadius: 8, overflow: 'hidden' },
  barFill:          { height: '100%', borderRadius: 8, backgroundColor: Colors.primary },
  barFull:          { backgroundColor: '#2E7D32' },

  emptyBox:  { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  emptyDesc:  { fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 19 },

  deckList:     { gap: 12 },
  deckCard:     { backgroundColor: Colors.surface, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 12 },
  deckCardPressed: { opacity: 0.85 },
  deckTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deckIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  deckName:     { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  deckMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  deckMetaText: { fontSize: 12, color: Colors.textLight },
  metaDot:      { fontSize: 12, color: Colors.textLight },
  slotsRow:  { flexDirection: 'row', gap: SLOT_GAP },
  slotEmpty: {
    width: SLOT_W, height: SLOT_H, borderRadius: 6,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },

  fab:       { position: 'absolute', bottom: 28, right: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  fabPressed: { opacity: 0.85 },
});
