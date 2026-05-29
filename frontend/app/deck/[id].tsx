import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppDialog, useDialog } from '../../components/AppDialog';
import { CardCell, CARD_ASPECT } from '../../components/CardCell';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { apiGetFullCollection } from '../../services/collectionService';
import {
  apiAddCardToDeck,
  apiDeleteDeck,
  apiGetDeck,
  apiRemoveCardFromDeck,
  apiRenameDeck,
} from '../../services/deckService';
import { CollectionEntry } from '../../types/collection';
import { DeckCardEntry, DeckData } from '../../types/decks';

const MAX_CARDS   = 5;
const MIN_CARDS   = 5;
const MAX_LEGENDS = 2;

const POSITIONS = ['ALL', 'POR', 'DF', 'MC', 'DC'] as const;
type PosFilter  = typeof POSITIONS[number];

// ── Dimensiones ───────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get('window').width;
const H_PAD    = 16;

const PICK_COLS = 4;
const PICK_GAP  = 4;
const PICK_W    = (SCREEN_W - H_PAD * 2 - PICK_GAP * (PICK_COLS - 1)) / PICK_COLS;

const SLOT_GAP = 6;
const SLOT_W   = (SCREEN_W - H_PAD * 2 - SLOT_GAP * (MAX_CARDS - 1)) / MAX_CARDS;
const SLOT_H   = Math.round(SLOT_W * CARD_ASPECT);

// ── Pantalla ──────────────────────────────────────────────────────────────────
export default function DeckEditorScreen() {
  const router     = useRouter();
  const navigation = useNavigation();
  const { user }   = useAuth();
  const { id }     = useLocalSearchParams<{ id: string }>();
  const deckId     = Number(id);

  const { dialogCfg, showAlert, showConfirm } = useDialog();

  const [deck,          setDeck]          = useState<DeckData | null>(null);
  const [collection,    setCollection]    = useState<CollectionEntry[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [posFilter,     setPosFilter]     = useState<PosFilter>('ALL');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [renameVisible, setRenameVisible] = useState(false);
  const [newName,       setNewName]       = useState('');
  const [actionId,      setActionId]      = useState<number | null>(null);
  const [renaming,      setRenaming]      = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  /** Carta del slot que el usuario quiere reemplazar (null = modo normal) */
  const [swapTarget,    setSwapTarget]    = useState<DeckCardEntry | null>(null);

  // ── Exit guard: bloquea salir si la baraja tiene < MIN_CARDS ─────────────
  useEffect(() => {
    const unsub = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (!deck || deck.cards.length >= MIN_CARDS) return;
      e.preventDefault();
      showAlert(
        'Baraja incompleta',
        `La baraja tiene ${deck.cards.length} de ${MIN_CARDS} cartas. Añade más cartas antes de salir.`,
      );
    });
    return unsub;
  }, [navigation, deck]);

  useEffect(() => {
    if (!user) return;
    Promise.all([apiGetDeck(user.id, deckId), apiGetFullCollection(user.id)])
      .then(([d, col]) => { setDeck(d); setCollection(col); })
      .catch(e => showAlert('Error', e.message))
      .finally(() => setLoading(false));
  }, [user?.id, deckId]);

  if (!user) return null;

  const cardCount   = deck?.cards.length ?? 0;
  const legendCount = deck?.cards.filter(e => e.card.type === 'LEGEND').length ?? 0;
  const isFull      = cardCount >= MAX_CARDS;

  // Cuántas veces aparece cada carta ya en la baraja
  const deckCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of deck?.cards ?? []) map.set(e.card.id, (map.get(e.card.id) ?? 0) + 1);
    return map;
  }, [deck?.cards]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return collection
      .filter(e => e.owned)
      .filter(e => posFilter === 'ALL' || e.card.position === posFilter)
      .filter(e => !q || e.card.name.toLowerCase().includes(q));
  }, [collection, posFilter, searchQuery]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Tap en un slot: entra/sale del modo swap */
  const handleSlotPress = (entry: DeckCardEntry) =>
    setSwapTarget(prev => prev?.deckCardId === entry.deckCardId ? null : entry);

  /** Quitar una carta sin reemplazarla */
  const handleRemoveDirect = async (entry: DeckCardEntry) => {
    setSwapTarget(null);
    setActionId(entry.deckCardId);
    try {
      await apiRemoveCardFromDeck(user.id, deckId, entry.deckCardId);
      setDeck(prev => prev
        ? { ...prev, cards: prev.cards.filter(e => e.deckCardId !== entry.deckCardId) }
        : prev);
    } catch (e: unknown) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al eliminar carta');
    } finally {
      setActionId(null);
    }
  };

  /** Intercambiar la carta del swapTarget por una nueva del picker */
  const handleSwap = async (newCardId: number) => {
    if (!swapTarget) return;
    const target = swapTarget;
    setSwapTarget(null);
    setActionId(target.deckCardId);
    try {
      // Quitar primero (baraja queda en 4) y luego añadir (vuelve a 5)
      await apiRemoveCardFromDeck(user.id, deckId, target.deckCardId);
      const newEntry = await apiAddCardToDeck(user.id, deckId, newCardId);
      setDeck(prev => prev ? {
        ...prev,
        cards: prev.cards.map(e => e.deckCardId === target.deckCardId ? newEntry : e),
      } : prev);
    } catch (e: unknown) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al cambiar carta');
      // Si el swap falla a medias, refrescamos el estado real
      try {
        const refreshed = await apiGetDeck(user.id, deckId);
        setDeck(refreshed);
      } catch {}
    } finally {
      setActionId(null);
    }
  };

  /** Añadir carta en modo normal (baraja incompleta) */
  const handleAdd = async (cardId: number) => {
    if (isFull) { showAlert('Baraja llena', `Solo puedes tener ${MAX_CARDS} cartas.`); return; }
    const alreadyInDeck = deckCountMap.get(cardId) ?? 0;
    const entry = collection.find(e => e.card.id === cardId);
    const owned = entry?.quantity ?? 0;
    if (alreadyInDeck >= owned) {
      showAlert('Sin copias disponibles', 'Ya usaste todas las copias de esta carta.');
      return;
    }
    setActionId(cardId);
    try {
      const newEntry = await apiAddCardToDeck(user.id, deckId, cardId);
      setDeck(prev => prev ? { ...prev, cards: [...prev.cards, newEntry] } : prev);
    } catch (e: unknown) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al añadir carta');
    } finally {
      setActionId(null);
    }
  };

  /** Picker press: swap si hay target, add en caso contrario */
  const handlePickerPress = (item: CollectionEntry) =>
    swapTarget ? handleSwap(item.card.id) : handleAdd(item.card.id);

  const handleRename = async () => {
    if (!newName.trim()) return;
    setRenaming(true);
    try {
      const updated = await apiRenameDeck(user.id, deckId, newName.trim());
      setDeck(prev => prev ? { ...prev, name: updated.name } : prev);
      setRenameVisible(false);
    } catch (e: unknown) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al renombrar la baraja');
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = () => {
    showConfirm(
      'Eliminar baraja',
      '¿Seguro que quieres eliminar esta baraja? No se puede deshacer.',
      async () => {
        setDeleting(true);
        try { await apiDeleteDeck(user.id, deckId); router.back(); }
        catch (e: unknown) {
          showAlert('Error', e instanceof Error ? e.message : 'Error al eliminar la baraja');
          setDeleting(false);
        }
      },
      { confirmLabel: 'Eliminar', destructive: true },
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
    </SafeAreaView>
  );

  if (!deck) return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}><Text style={styles.errorText}>Baraja no encontrada</Text></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={Colors.textDark} />
        </Pressable>
        <Pressable
          style={styles.namePressable}
          onPress={() => { setNewName(deck.name); setRenameVisible(true); }}
        >
          <Text style={styles.headerName} numberOfLines={1}>{deck.name}</Text>
          <Ionicons name="pencil-outline" size={14} color={Colors.textLight} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={handleDelete} disabled={deleting}>
          {deleting
            ? <ActivityIndicator size={20} color={Colors.error} />
            : <Ionicons name="trash-outline" size={22} color={Colors.error} />}
        </Pressable>
      </View>

      <FlatList
        data={filteredCards}
        keyExtractor={item => String(item.card.id)}
        numColumns={PICK_COLS}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <>
            {/* ── Slots ── */}
            <View style={styles.slotsSection}>
              <View style={styles.slotsSectionHeader}>
                <Text style={styles.sectionTitle}>Cartas en la baraja</Text>
                <Text style={[styles.slotCount, isFull && styles.slotCountFull]}>
                  {cardCount} / {MAX_CARDS}
                  {legendCount > 0 ? `  ★ ${legendCount}/${MAX_LEGENDS}` : ''}
                </Text>
              </View>

              <View style={styles.slotsRow}>
                {Array.from({ length: MAX_CARDS }, (_, idx) => {
                  const entry      = deck.cards[idx] ?? null;
                  const isSelected = swapTarget?.deckCardId === entry?.deckCardId;
                  const dimmed     = swapTarget !== null && !isSelected;
                  return entry ? (
                    <View key={idx} style={{ position: 'relative' }}>
                      <CardCell
                        card={entry.card}
                        owned
                        width={SLOT_W}
                        loading={actionId === entry.deckCardId}
                        onPress={() => handleSlotPress(entry)}
                      />
                      {/* Ring de selección */}
                      {isSelected && (
                        <View
                          style={[StyleSheet.absoluteFill, styles.slotSelectionRing]}
                          pointerEvents="none"
                        />
                      )}
                      {/* Dim de los no seleccionados */}
                      {dimmed && (
                        <View
                          style={[StyleSheet.absoluteFill, styles.slotDimOverlay]}
                          pointerEvents="none"
                        />
                      )}
                    </View>
                  ) : (
                    <View key={idx} style={styles.slotEmpty}>
                      <Ionicons name="add" size={22} color={Colors.border} />
                    </View>
                  );
                })}
              </View>

              {/* ── Banner según estado ── */}
              {swapTarget ? (
                <View style={styles.swapBanner}>
                  <View style={styles.swapBannerInfo}>
                    <Ionicons name="swap-horizontal" size={15} color={Colors.primary} />
                    <Text style={styles.swapBannerText} numberOfLines={1}>
                      Reemplazando{' '}
                      <Text style={styles.swapBannerName}>{swapTarget.card.name}</Text>
                    </Text>
                  </View>
                  <View style={styles.swapBannerBtns}>
                    <Pressable
                      style={styles.swapRemoveBtn}
                      onPress={() => handleRemoveDirect(swapTarget)}
                    >
                      <Ionicons name="trash-outline" size={13} color={Colors.error} />
                      <Text style={styles.swapRemoveText}>Quitar</Text>
                    </Pressable>
                    <Pressable
                      style={styles.swapCancelBtn}
                      onPress={() => setSwapTarget(null)}
                    >
                      <Text style={styles.swapCancelText}>Cancelar</Text>
                    </Pressable>
                  </View>
                </View>
              ) : isFull ? (
                <View style={styles.fullBanner}>
                  <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
                  <Text style={styles.fullBannerText}>
                    Baraja completa — pulsa una carta para cambiarla
                  </Text>
                </View>
              ) : null}
            </View>

            {/* ── Filtros ── */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>
                {swapTarget
                  ? 'Elige la carta de reemplazo'
                  : isFull ? 'Cartas de tu colección' : 'Añadir carta'}
              </Text>

              {/* Búsqueda */}
              <View style={styles.searchBarWrap}>
                <Ionicons name="search" size={15} color={Colors.textLight} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por nombre..."
                  placeholderTextColor={Colors.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={17} color={Colors.textLight} />
                  </Pressable>
                )}
              </View>

              <View style={styles.filterRow}>
                {POSITIONS.map(pos => (
                  <Pressable
                    key={pos}
                    style={[styles.filterChip, posFilter === pos && styles.filterChipActive]}
                    onPress={() => setPosFilter(pos)}
                  >
                    <Text style={[styles.filterChipText, posFilter === pos && styles.filterChipTextActive]}>
                      {pos === 'ALL' ? 'Todos' : pos}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyPicker}>
            <Text style={styles.emptyPickerText}>
              {isFull && !swapTarget
                ? 'La baraja ya está completa'
                : 'No tienes cartas de esta posición'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const usedInDeck = deckCountMap.get(item.card.id) ?? 0;
          // En modo swap: la carta del slot se va a liberar, así que "devolvemos" 1 copia
          const adjustedUsed = (swapTarget?.card.id === item.card.id)
            ? Math.max(0, usedInDeck - 1)
            : usedInDeck;
          const available    = item.quantity - adjustedUsed;
          const noMoreCopies = available <= 0;
          // En modo swap: ignoramos isFull (el deck pasa por 4 temporalmente)
          const isDisabled   = swapTarget ? noMoreCopies : (isFull || noMoreCopies);
          return (
            <CardCell
              card={item.card}
              owned={item.owned}
              quantity={available}
              alwaysShowQuantity
              width={PICK_W}
              disabled={isDisabled}
              loading={actionId === item.card.id}
              onPress={() => handlePickerPress(item)}
            />
          );
        }}
      />

      {/* ── Modal renombrar ── */}
      <Modal
        visible={renameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setRenameVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Renombrar baraja</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              maxLength={40}
              autoFocus
              onSubmitEditing={handleRename}
              placeholder="Nombre de la baraja"
              placeholderTextColor={Colors.textLight}
            />
            <View style={styles.modalBtns}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setRenameVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSave, renaming && { opacity: 0.6 }]}
                onPress={handleRename}
                disabled={renaming}
              >
                {renaming
                  ? <ActivityIndicator size={16} color="#fff" />
                  : <Text style={styles.modalBtnSaveText}>Guardar</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <AppDialog {...dialogCfg} />
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: Colors.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: Colors.textLight },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight, gap: 4,
  },
  iconBtn:       { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  namePressable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  headerName:    { fontSize: 17, fontWeight: '700', color: Colors.textDark, flex: 1 },

  listContent: { paddingHorizontal: H_PAD, paddingBottom: 24 },
  row:         { gap: PICK_GAP, marginBottom: PICK_GAP },

  slotsSection:       { paddingVertical: 14, gap: 10 },
  slotsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:       { fontSize: 12, fontWeight: '800', color: Colors.textLight, letterSpacing: 0.8, textTransform: 'uppercase' },
  slotCount:          { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  slotCountFull:      { color: '#2E7D32' },

  slotsRow:  { flexDirection: 'row', gap: SLOT_GAP },
  slotEmpty: {
    width: SLOT_W, height: SLOT_H, borderRadius: 6,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },

  // Overlays sobre las cartas del slot
  slotSelectionRing: {
    borderRadius: 6, borderWidth: 2.5, borderColor: Colors.primary,
  },
  slotDimOverlay: {
    borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.5)',
  },

  // Banner de swap
  swapBanner: {
    backgroundColor: Colors.primaryLight, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.primary,
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 8,
  },
  swapBannerInfo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  swapBannerText: { flex: 1, fontSize: 13, color: Colors.textDark },
  swapBannerName: { fontWeight: '700' },
  swapBannerBtns: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  swapRemoveBtn:  {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.error,
  },
  swapRemoveText: { fontSize: 12, fontWeight: '700', color: Colors.error },
  swapCancelBtn:  {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  swapCancelText: { fontSize: 12, fontWeight: '700', color: Colors.textMid },

  // Banner baraja completa
  fullBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E8F5E9', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  fullBannerText: { fontSize: 12, fontWeight: '600', color: '#2E7D32', flex: 1 },

  filterSection: { paddingBottom: 10, gap: 8 },
  searchBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.textDark, padding: 0 },
  filterRow:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterChip:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border },
  filterChipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText:       { fontSize: 12, fontWeight: '700', color: Colors.textMid },
  filterChipTextActive: { color: '#fff' },

  emptyPicker:     { padding: 32, alignItems: 'center' },
  emptyPickerText: { fontSize: 14, color: Colors.textLight, textAlign: 'center' },

  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard:  { backgroundColor: Colors.background, borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textDark, textAlign: 'center' },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.textDark, backgroundColor: Colors.surface,
  },
  modalBtns:          { flexDirection: 'row', gap: 10 },
  modalBtn:           { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalBtnCancel:     { backgroundColor: Colors.primaryLight },
  modalBtnCancelText: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  modalBtnSave:       { backgroundColor: Colors.primary },
  modalBtnSaveText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
});
