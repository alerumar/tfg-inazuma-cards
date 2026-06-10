
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { AppDialog, useDialog } from '../../components/AppDialog';
import { CardCell, CARD_ASPECT } from '../../components/CardCell';
import { BASE_URL } from '../../constants/api';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { apiGetFriends } from '../../services/friendshipService';
import { apiGetFullCollection } from '../../services/collectionService';
import { apiGetActiveParticipantIds, apiProposeTrade } from '../../services/tradeService';
import { PersonResponse } from '../../types/auth';
import { FriendshipData } from '../../types/friendship';
import { CardData } from '../../types/collection';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD    = 16;
const COLS     = 4;
const GAP      = 4;
const CARD_W   = (SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS;

const avatarUri = (p: PersonResponse) =>
  p.profilePhoto
    ? { uri: `${BASE_URL}${p.profilePhoto}` }
    : { uri: `${BASE_URL}/images/default_profile.png` };

const getFriend = (f: FriendshipData, userId: number) =>
  f.requester.id === userId ? f.receiver : f.requester;

export default function NewTradeScreen() {
  const router   = useRouter();
  const { user } = useAuth();
  const { dialogCfg, showAlert } = useDialog();

  const [step,            setStep]           = useState<1 | 2>(1);
  const [friends,         setFriends]         = useState<FriendshipData[]>([]);
  const [busyIds,         setBusyIds]         = useState<Set<number>>(new Set());
  const [selected,        setSelected]        = useState<PersonResponse | null>(null);
  const [cards,           setCards]           = useState<{ card: CardData; quantity: number }[]>([]);
  const [pickedCard,      setPickedCard]      = useState<CardData | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [sending,         setSending]         = useState(false);
  const [search,          setSearch]          = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      apiGetFriends(user.id),
      apiGetActiveParticipantIds(),
    ])
      .then(([fl, ids]) => {
        setFriends(fl);
        setBusyIds(new Set(ids));
      })
      .catch(e => showAlert('Error', e instanceof Error ? e.message : 'Error al cargar amigos'))
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (step !== 2 || !user) return;
    setLoading(true);
    apiGetFullCollection(user.id)
      .then(col => setCards(
        col
          .filter(e => e.owned && e.quantity >= 2)
          .map(e => ({ card: e.card, quantity: e.quantity })),
      ))
      .catch(e => showAlert('Error', e instanceof Error ? e.message : 'Error al cargar colección'))
      .finally(() => setLoading(false));
  }, [step, user?.id]);

  if (!user) return null;

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    return friends.map(f => getFriend(f, user.id))
      .filter(p => !q || p.nickname.toLowerCase().includes(q) || p.playerId.toLowerCase().includes(q));
  }, [friends, search, user.id]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter(c => !q || c.card.name.toLowerCase().includes(q));
  }, [cards, search]);

  const canSend = !!selected && !!pickedCard;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await apiProposeTrade(user.id, selected!.id, pickedCard!.id);
      router.back();
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al proponer el intercambio');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>

<View style={styles.header}>
        <Pressable
          style={styles.cancelBtn}
          onPress={() => {
            if (step === 2) { setStep(1); setPickedCard(null); setSearch(''); }
            else { router.back(); }
          }}
          disabled={sending}
        >
          <Text style={styles.cancelText}>{step === 2 ? 'Atrás' : 'Cancelar'}</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Nuevo intercambio</Text>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          </View>
        </View>

        <Pressable
          style={[styles.sendBtn, (!canSend || step < 2) && styles.sendBtnOff]}
          onPress={handleSend}
          disabled={!canSend || step < 2 || sending}
        >
          {sending
            ? <ActivityIndicator size={16} color="#fff" />
            : <Text style={[styles.sendBtnText, (!canSend || step < 2) && styles.sendBtnTextOff]}>Enviar</Text>}
        </Pressable>
      </View>

{(selected || pickedCard) && (
        <View style={styles.summaryBar}>
          {selected && (
            <View style={styles.summaryItem}>
              <Image source={avatarUri(selected)} style={styles.summaryAvatar} />
              <Text style={styles.summaryText} numberOfLines={1}>{selected.nickname}</Text>
            </View>
          )}
          {selected && pickedCard && (
            <Ionicons name="swap-horizontal" size={16} color={Colors.textLight} />
          )}
          {pickedCard && (
            <View style={styles.summaryItem}>
              <CardCell card={pickedCard} owned width={36} compact />
              <Text style={styles.summaryText} numberOfLines={1}>{pickedCard.name}</Text>
            </View>
          )}
        </View>
      )}

<View style={styles.searchWrap}>
        <Ionicons name="search" size={15} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder={step === 1 ? 'Buscar amigo…' : 'Buscar carta…'}
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

<Text style={styles.stepTitle}>
        {step === 1 ? 'Elige un amigo' : 'Elige la carta que ofreces'}
      </Text>
      {step === 2 && (
        <Text style={styles.stepHint}>Solo puedes ofrecer cartas que tengas repetidas (×2 o más)</Text>
      )}

{loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : step === 1 ? (
        
        filteredFriends.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="people-outline" size={48} color={Colors.primaryLight} />
            <Text style={styles.emptyText}>
              {friends.length === 0 ? 'No tienes amigos todavía' : 'Sin resultados'}
            </Text>
          </View>
        ) : (
          <FlatList
            key="friends-list"
            data={filteredFriends}
            keyExtractor={p => String(p.id)}
            contentContainerStyle={styles.friendList}
            renderItem={({ item: p }) => {
              const isChosen = selected?.id === p.id;
              const isBusy   = busyIds.has(p.id);
              return (
                <Pressable
                  style={[styles.friendRow, isChosen && styles.friendRowSelected, isBusy && styles.friendRowBusy]}
                  onPress={() => {
                    if (isBusy) return;
                    setSelected(p); setSearch(''); setStep(2);
                  }}
                  disabled={isBusy}
                >
                  <Image source={avatarUri(p)} style={[styles.friendAvatar, isBusy && { opacity: 0.4 }]} />
                  <View style={styles.friendInfo}>
                    <Text style={[styles.friendNick, isBusy && { color: Colors.textLight }]}>{p.nickname}</Text>
                    {isBusy
                      ? <Text style={styles.busyLabel}>Ya tiene un intercambio en curso</Text>
                      : <Text style={styles.friendSub}>ID: {p.playerId} · Nv. {p.level}</Text>}
                  </View>
                  <Ionicons
                    name={isBusy ? 'lock-closed' : isChosen ? 'checkmark-circle' : 'chevron-forward'}
                    size={20}
                    color={isBusy ? Colors.border : isChosen ? Colors.primary : Colors.textLight}
                  />
                </Pressable>
              );
            }}
          />
        )
      ) : (
        
        filteredCards.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="albums-outline" size={48} color={Colors.primaryLight} />
            <Text style={styles.emptyText}>No tienes cartas repetidas para ofrecer</Text>
          </View>
        ) : (
          <FlatList
            key="cards-grid"
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
                    onPress={() => setPickedCard(item.card)}
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
        )
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
  cancelBtn:  { minWidth: 64 },
  cancelText: { fontSize: 15, color: Colors.textMid, fontWeight: '500' },

  headerCenter: { alignItems: 'center', gap: 6, flex: 1 },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  stepDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.primary },
  stepLine:      { width: 20, height: 2, backgroundColor: Colors.border },

  sendBtn:    { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, minWidth: 64, alignItems: 'center' },
  sendBtnOff: { backgroundColor: Colors.primaryLight },
  sendBtnText:    { fontSize: 15, fontWeight: '700', color: '#fff' },
  sendBtnTextOff: { color: Colors.textLight },

  summaryBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: H_PAD, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  summaryItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border },
  summaryText:   { fontSize: 12, fontWeight: '600', color: Colors.textDark, maxWidth: 90 },

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

  friendList: { padding: H_PAD, gap: 8 },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    padding: 12,
  },
  friendRowSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  friendRowBusy:     { opacity: 0.6, backgroundColor: Colors.background },
  busyLabel:         { fontSize: 11, color: Colors.textLight, fontStyle: 'italic' },
  friendAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.border },
  friendInfo:   { flex: 1, gap: 2 },
  friendNick:   { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  friendSub:    { fontSize: 12, color: Colors.textLight },

  grid:      { paddingHorizontal: H_PAD, paddingBottom: 24, paddingTop: 4 },
  cardCheck: { position: 'absolute', top: -4, right: -4 },

  emptyText: { fontSize: 14, color: Colors.textLight, textAlign: 'center' },
});
