import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
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
import { apiCreateDeck } from '../../services/deckService';
import { CardData, CollectionEntry } from '../../types/collection';

const MAX_CARDS   = 5;
const MAX_LEGENDS = 2;

const POSITIONS = ['ALL', 'POR', 'DF', 'MC', 'DC'] as const;
type PosFilter  = typeof POSITIONS[number];

const SCREEN_W  = Dimensions.get('window').width;
const H_PAD     = 16;

const PICK_COLS = 4;
const PICK_GAP  = 4;
const PICK_W    = (SCREEN_W - H_PAD * 2 - PICK_GAP * (PICK_COLS - 1)) / PICK_COLS;

const SLOT_GAP  = 6;
const SLOT_W    = (SCREEN_W - H_PAD * 2 - SLOT_GAP * (MAX_CARDS - 1)) / MAX_CARDS;
const SLOT_H    = Math.round(SLOT_W * CARD_ASPECT);

export default function NewDeckScreen() {
  const router   = useRouter();
  const { user } = useAuth();
  const { dialogCfg, showAlert } = useDialog();

  const [collection,  setCollection]  = useState<CollectionEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<CardData[]>([]);
  const [deckName,    setDeckName]    = useState('');
  const [posFilter,   setPosFilter]   = useState<PosFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [creating,    setCreating]    = useState(false);

  useEffect(() => {
    if (!user) return;
    apiGetFullCollection(user.id)
      .then(setCollection)
      .catch(e => showAlert('Error', e.message))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!user) return null;

  const legendCount = selected.filter(c => c.type === 'LEGEND').length;
  const isFull      = selected.length >= MAX_CARDS;
  const canCreate   = isFull && deckName.trim().length > 0;
  const remaining   = MAX_CARDS - selected.length;

  const selectedCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const card of selected) map.set(card.id, (map.get(card.id) ?? 0) + 1);
    return map;
  }, [selected]);

  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return collection
      .filter(e => e.owned)
      .filter(e => posFilter === 'ALL' || e.card.position === posFilter)
      .filter(e => !q || e.card.name.toLowerCase().includes(q));
  }, [collection, posFilter, searchQuery]);

const handleSelect = (card: CardData) => {
    if (isFull) {
      showAlert('Baraja llena', `Solo puedes seleccionar ${MAX_CARDS} cartas.`);
      return;
    }
    if (card.type === 'LEGEND' && legendCount >= MAX_LEGENDS) {
      showAlert('Límite de leyendas', `Solo puedes incluir ${MAX_LEGENDS} cartas Legend por baraja.`);
      return;
    }
    const alreadySelected = selectedCountMap.get(card.id) ?? 0;
    if (alreadySelected >= 1) {
      showAlert('Carta duplicada', `"${card.name}" ya está en la baraja.`);
      return;
    }
    setSelected(prev => [...prev, card]);
  };

  const handleRemoveSlot = (index: number) =>
    setSelected(prev => prev.filter((_, i) => i !== index));

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      await apiCreateDeck(user.id, deckName.trim(), selected.map(c => c.id));
      router.back();
    } catch (e: unknown) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al crear la baraja');
    } finally {
      setCreating(false);
    }
  };

return (
    <SafeAreaView style={styles.root}>

<View style={styles.header}>
        <Pressable style={styles.cancelBtn} onPress={() => router.back()} disabled={creating}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Nueva baraja</Text>
        <Pressable
          style={[styles.createBtn, !canCreate && styles.createBtnOff]}
          onPress={handleCreate}
          disabled={!canCreate || creating}
        >
          {creating
            ? <ActivityIndicator size={16} color="#fff" />
            : <Text style={[styles.createBtnText, !canCreate && styles.createBtnTextOff]}>Crear</Text>}
        </Pressable>
      </View>

<View style={styles.nameSection}>
        <TextInput
          style={styles.nameInput}
          placeholder="Nombre de la baraja..."
          placeholderTextColor={Colors.textLight}
          value={deckName}
          onChangeText={setDeckName}
          maxLength={40}
        />
      </View>

<View style={styles.slotsSection}>
        <View style={styles.slotsSectionHeader}>
          <Text style={styles.slotsLabel}>Cartas seleccionadas</Text>
          <Text style={[styles.slotsCount, isFull && styles.slotsCountFull]}>
            {selected.length} / {MAX_CARDS}
          </Text>
        </View>

        <View style={styles.slotsRow}>
          {Array.from({ length: MAX_CARDS }, (_, idx) => {
            const card = selected[idx] ?? null;
            return card ? (
              <CardCell
                key={idx}
                card={card}
                owned
                width={SLOT_W}
                removable
                onPress={() => handleRemoveSlot(idx)}
              />
            ) : (
              <View key={idx} style={styles.slotEmpty}>
                <Ionicons name="add" size={22} color={Colors.border} />
              </View>
            );
          })}
        </View>

        {!isFull ? (
          <Text style={styles.hint}>
            Añade {remaining} carta{remaining !== 1 ? 's' : ''} más para poder crear la baraja
          </Text>
        ) : (
          <Text style={styles.hintReady}>
            ✓ Baraja lista — ponle un nombre y pulsa Crear
          </Text>
        )}
      </View>

<View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Selecciona cartas de tu colección</Text>

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

{loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filteredCards.length === 0 ? (
            <View style={styles.emptyPicker}>
              <Text style={styles.emptyPickerText}>No tienes cartas de esta posición</Text>
            </View>
          ) : (
            <View style={styles.gridInner}>
              {filteredCards.map(item => {
                const usedCopies   = selectedCountMap.get(item.card.id) ?? 0;
                const noMoreCopies = usedCopies >= 1;
                const available    = noMoreCopies ? 0 : item.quantity;
                return (
                  <CardCell
                    key={String(item.card.id)}
                    card={item.card}
                    owned={item.owned}
                    quantity={available}
                    alwaysShowQuantity
                    width={PICK_W}
                    disabled={isFull || noMoreCopies}
                    onPress={() => handleSelect(item.card)}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
      <AppDialog {...dialogCfg} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  cancelBtn:    { minWidth: 70 },
  cancelText:   { fontSize: 15, color: Colors.textMid, fontWeight: '500' },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: Colors.textDark },
  createBtn:    { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, minWidth: 70, alignItems: 'center' },
  createBtnOff: { backgroundColor: Colors.primaryLight },
  createBtnText:    { fontSize: 15, fontWeight: '700', color: '#fff' },
  createBtnTextOff: { color: Colors.textLight },

  nameSection: { paddingHorizontal: H_PAD, paddingTop: 12, paddingBottom: 4 },
  nameInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: Colors.textDark, backgroundColor: Colors.surface,
  },

  slotsSection:       { paddingHorizontal: H_PAD, paddingTop: 12, gap: 8 },
  slotsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotsLabel:     { fontSize: 12, fontWeight: '800', color: Colors.textLight, letterSpacing: 0.8, textTransform: 'uppercase' },
  slotsCount:     { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  slotsCountFull: { color: '#2E7D32' },

  slotsRow: { flexDirection: 'row', gap: SLOT_GAP },
  slotEmpty: {
    width: SLOT_W, height: SLOT_H, borderRadius: 6,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },

  hint:      { fontSize: 12, color: Colors.textLight, textAlign: 'center' },
  hintReady: { fontSize: 12, color: '#2E7D32', fontWeight: '600', textAlign: 'center' },

  filterSection: { paddingHorizontal: H_PAD, paddingTop: 10, paddingBottom: 6, gap: 8 },
  filterLabel:   { fontSize: 12, fontWeight: '800', color: Colors.textLight, letterSpacing: 0.8, textTransform: 'uppercase' },
  searchBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.textDark, padding: 0 },
  filterRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterChip:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border },
  filterChipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText:       { fontSize: 12, fontWeight: '700', color: Colors.textMid },
  filterChipTextActive: { color: '#fff' },

  grid:      { paddingHorizontal: H_PAD, paddingBottom: 24, paddingTop: 4 },
  gridInner: { flexDirection: 'row', flexWrap: 'wrap', gap: PICK_GAP },

  emptyPicker:     { padding: 32, alignItems: 'center' },
  emptyPickerText: { fontSize: 14, color: Colors.textLight, textAlign: 'center' },
});
