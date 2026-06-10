
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppDialog, useDialog } from '../../../components/AppDialog';
import { CardCell, CARD_ASPECT } from '../../../components/CardCell';
import { BASE_URL } from '../../../constants/api';
import { Colors } from '../../../constants/colors';
import { useAuth } from '../../../context/AuthContext';
import { apiGetFullCollection } from '../../../services/collectionService';
import { apiGetTrade, apiRespondTrade } from '../../../services/tradeService';
import { PersonResponse } from '../../../types/auth';
import { CardData } from '../../../types/collection';
import { TradeData } from '../../../types/trades';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD    = 16;
const COLS     = 4;
const GAP      = 4;
const CARD_W   = (SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS;

const OFFERED_W = 96;
const OFFERED_H = Math.round(OFFERED_W * CARD_ASPECT);

const avatarUri = (p: PersonResponse) =>
  p.profilePhoto
    ? { uri: `${BASE_URL}${p.profilePhoto}` }
    : { uri: `${BASE_URL}/images/default_profile.png` };

export default function RespondTradeScreen() {
  const router             = useRouter();
  const { id }             = useLocalSearchParams<{ id: string }>();
  const { user }           = useAuth();
  const { dialogCfg, showAlert } = useDialog();

  const [trade,         setTrade]         = useState<TradeData | null>(null);
  const [cards,         setCards]         = useState<{ card: CardData; quantity: number }[]>([]);
  const [alreadyOwned,  setAlreadyOwned]  = useState(false);
  const [pickedCard,    setPickedCard]    = useState<CardData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const [search,        setSearch]        = useState('');

  const tradeId = Number(id);

  useEffect(() => {
    if (!user || !tradeId) return;
    setLoading(true);
    Promise.all([
      apiGetTrade(tradeId),
      apiGetFullCollection(user.id),
    ])
      .then(([t, col]) => {
        setTrade(t);
        const sameType = t.initiatorCard?.type ?? 'NORMAL';
        setCards(
          col
            .filter(e => e.owned && e.quantity >= 2 && e.card.type === sameType)
            .map(e => ({ card: e.card, quantity: e.quantity })),
        );
        const offered = col.find(e => e.card.id === t.initiatorCard?.id);
        setAlreadyOwned(!!offered && offered.owned);
      })
      .catch(e => showAlert('Error', e instanceof Error ? e.message : 'Error al cargar el intercambio'))
      .finally(() => setLoading(false));
  }, [tradeId, user?.id]);

  if (!user) return null;

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter(c => !q || c.card.name.toLowerCase().includes(q));
  }, [cards, search]);

  const handleSend = async () => {
    if (!pickedCard) return;
    setSending(true);
    try {
      await apiRespondTrade(tradeId, user.id, pickedCard.id);
      router.back();
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al responder al intercambio');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>

<View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} disabled={sending}>
          <Ionicons name="chevron-back" size={26} color={Colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Responder intercambio</Text>
        <Pressable
          style={[styles.sendBtn, !pickedCard && styles.sendBtnOff]}
          onPress={handleSend}
          disabled={!pickedCard || sending}
        >
          {sending
            ? <ActivityIndicator size={16} color="#fff" />
            : <Text style={[styles.sendBtnText, !pickedCard && styles.sendBtnTextOff]}>Enviar</Text>}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : !trade ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Intercambio no encontrado</Text>
        </View>
      ) : (
        <>
          
          <View style={styles.offeredSection}>
            <Text style={styles.sectionLabel}>Te ofrecen</Text>
            <View style={styles.offeredRow}>
              
              <View style={styles.partnerWrap}>
                <Image source={avatarUri(trade.initiator)} style={styles.partnerAvatar} />
                <Text style={styles.partnerNick} numberOfLines={1}>{trade.initiator.nickname}</Text>
              </View>

{trade.initiatorCard && (
                <View style={styles.offeredCardWrap}>
                  <View style={{ position: 'relative' }}>
                    <CardCell card={trade.initiatorCard} owned width={OFFERED_W} />
                    {!alreadyOwned && (
                      <View style={styles.newBadge} pointerEvents="none">
                        <Ionicons name="sparkles" size={10} color="#fff" />
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.offeredCardName} numberOfLines={2}>{trade.initiatorCard.name}</Text>
                  <View style={[styles.ownedBadge, alreadyOwned ? styles.ownedBadgeYes : styles.ownedBadgeNo]}>
                    <Ionicons
                      name={alreadyOwned ? 'checkmark-circle' : 'close-circle'}
                      size={12}
                      color={alreadyOwned ? '#2E7D32' : '#9E9E9E'}
                    />
                    <Text style={[styles.ownedBadgeText, alreadyOwned ? styles.ownedBadgeTextYes : styles.ownedBadgeTextNo]}>
                      {alreadyOwned ? 'Ya la tienes' : 'No la tienes'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

<View style={styles.searchWrap}>
            <Ionicons name="search" size={15} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar carta…"
              placeholderTextColor={Colors.textLight}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={Colors.textLight} />
              </Pressable>
            )}
          </View>

<Text style={styles.stepTitle}>Elige tu carta a cambio</Text>
          <Text style={styles.stepHint}>
            {`Solo cartas ${trade.initiatorCard?.type === 'LEGEND' ? 'legendarias' : 'normales'} repetidas (×2 o más)`}
          </Text>

{filteredCards.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="albums-outline" size={48} color={Colors.primaryLight} />
              <Text style={styles.emptyText}>
                {cards.length === 0
                  ? 'No tienes cartas repetidas para ofrecer'
                  : 'Sin resultados'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredCards}
              keyExtractor={c => String(c.card.id)}
              numColumns={COLS}
              contentContainerStyle={styles.grid}
              columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
              renderItem={({ item }) => {
                const isChosen = pickedCard?.id === item.card.id;
                return (
                  <View>
                    <CardCell
                      card={item.card}
                      owned
                      quantity={item.quantity}
                      alwaysShowQuantity
                      width={CARD_W}
                      onPress={() => setPickedCard(isChosen ? null : item.card)}
                    />
                    {isChosen && (
                      <View style={styles.cardCheck}>
                        <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}

{pickedCard && (
            <View style={styles.summaryBar}>
              <CardCell card={trade.initiatorCard} owned width={36} compact />
              <Ionicons name="swap-horizontal" size={18} color={Colors.textLight} />
              <CardCell card={pickedCard} owned width={36} compact />
              <Text style={styles.summaryText} numberOfLines={1}>
                {trade.initiatorCard.name} ↔ {pickedCard.name}
              </Text>
            </View>
          )}
        </>
      )}

      <AppDialog {...dialogCfg} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  backBtn:        { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { fontSize: 16, fontWeight: '700', color: Colors.textDark, flex: 1, textAlign: 'center' },

  sendBtn:    { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, minWidth: 64, alignItems: 'center' },
  sendBtnOff: { backgroundColor: Colors.primaryLight },
  sendBtnText:    { fontSize: 15, fontWeight: '700', color: '#fff' },
  sendBtnTextOff: { color: Colors.textLight },

  offeredSection: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
    paddingHorizontal: H_PAD, paddingVertical: 12, gap: 10,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: Colors.textLight,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  offeredRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },

  partnerWrap:   { alignItems: 'center', gap: 5, width: 60 },
  partnerAvatar: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.primaryLight,
  },
  partnerNick:   { fontSize: 11, fontWeight: '600', color: Colors.textMid, textAlign: 'center' },

  offeredCardWrap: { alignItems: 'center', gap: 6 },
  offeredCardName: {
    fontSize: 11, fontWeight: '600', color: Colors.textDark,
    textAlign: 'center', maxWidth: OFFERED_W + 8,
  },
  ownedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1,
  },
  ownedBadgeYes:  { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  ownedBadgeNo:   { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },
  ownedBadgeText: { fontSize: 10, fontWeight: '700' },
  ownedBadgeTextYes: { color: '#2E7D32' },
  ownedBadgeTextNo:  { color: '#9E9E9E' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: H_PAD, marginTop: 12,
    backgroundColor: Colors.surface, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.textDark, padding: 0 },

  stepTitle: {
    fontSize: 13, fontWeight: '800', color: Colors.textLight,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginHorizontal: H_PAD, marginTop: 14, marginBottom: 2,
  },
  stepHint: {
    fontSize: 12, color: Colors.textLight,
    marginHorizontal: H_PAD, marginBottom: 6,
  },

  grid:      { paddingHorizontal: H_PAD, paddingBottom: 80, paddingTop: 4 },
  cardCheck: { position: 'absolute', top: -4, right: -4 },

  summaryBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: H_PAD, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.primaryLight,
  },
  summaryText: {
    flex: 1, fontSize: 12, fontWeight: '600', color: Colors.textDark,
  },

  emptyText: { fontSize: 14, color: Colors.textLight, textAlign: 'center' },

  newBadge: {
    position: 'absolute', top: -9, right: -9,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#16A34A',
    borderRadius: 20, paddingHorizontal: 7, paddingVertical: 4,
    transform: [{ rotate: '10deg' }], zIndex: 20, elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4,
  },
  newBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
});
