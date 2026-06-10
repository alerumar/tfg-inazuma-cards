import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppDialog, useDialog } from '../components/AppDialog';
import { CardCell, CARD_ASPECT } from '../components/CardCell';
import { BASE_URL } from '../constants/api';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import {
  apiCancelTrade,
  apiConfirmTrade,
  apiGetActiveTrades,
  apiGetTradeHistory,
  apiRespondTrade,
} from '../services/tradeService';
import { apiGetFullCollection } from '../services/collectionService';
import { PersonResponse } from '../types/auth';
import { TradeData, TradeStatus } from '../types/trades';

const CARD_W = 64;
const CARD_H = Math.round(CARD_W * CARD_ASPECT);

const avatarUri = (p: PersonResponse) =>
  p.profilePhoto
    ? { uri: `${BASE_URL}${p.profilePhoto}` }
    : { uri: `${BASE_URL}/images/default_profile.png` };

function statusLabel(status: TradeStatus, iAmInitiator: boolean): string {
  switch (status) {
    case 'PENDING_RESPONSE':
      return iAmInitiator ? 'Esperando respuesta' : 'Propuesta recibida';
    case 'PENDING_CONFIRMATION':
      return iAmInitiator ? 'Respuesta recibida — confirma' : 'Esperando confirmación';
    case 'COMPLETED':           return '✓ Completado';
    case 'REJECTED_BY_RECEIVER':return 'Rechazado';
    case 'REJECTED_BY_INITIATOR':return 'Cancelado';
  }
}

function statusColor(status: TradeStatus): string {
  switch (status) {
    case 'COMPLETED':            return '#2E7D32';
    case 'REJECTED_BY_RECEIVER':
    case 'REJECTED_BY_INITIATOR': return '#9E9E9E';
    case 'PENDING_CONFIRMATION': return '#F59E0B';
    default:                     return Colors.primary;
  }
}

const isActive = (s: TradeStatus) =>
  s === 'PENDING_RESPONSE' || s === 'PENDING_CONFIRMATION';

export default function TradesScreen() {
  const router                             = useRouter();
  const { user, refreshBadges }           = useAuth();
  const { dialogCfg, showAlert, showConfirm } = useDialog();

  const [active,       setActive]       = useState<TradeData[]>([]);
  const [history,      setHistory]      = useState<TradeData[]>([]);
  const [ownedCardIds, setOwnedCardIds] = useState<Set<number>>(new Set());
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [acting,       setActing]       = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [a, h, col] = await Promise.all([
        apiGetActiveTrades(user.id),
        apiGetTradeHistory(user.id),
        apiGetFullCollection(user.id),
      ]);
      setActive(a);
      setHistory(h.filter(t => !isActive(t.status)));
      setOwnedCardIds(new Set(col.filter(e => e.owned).map(e => e.card.id)));
      refreshBadges(); 
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al cargar intercambios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, refreshBadges]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!user) return null;

  const handleReject = (trade: TradeData) => {
    showConfirm(
      'Rechazar intercambio',
      `¿Seguro que quieres rechazar la propuesta de ${trade.initiator.nickname}?`,
      async () => {
        setActing(trade.id);
        try {
          await apiRespondTrade(trade.id, user.id, null);
          await load();
        } catch (e) {
          showAlert('Error', e instanceof Error ? e.message : 'Error al rechazar');
        } finally {
          setActing(null);
        }
      },
      { confirmLabel: 'Rechazar', destructive: true },
    );
  };

  const handleWithdraw = (trade: TradeData) => {
    showConfirm(
      'Retirar propuesta',
      `¿Seguro que quieres retirar la propuesta enviada a ${trade.receiver.nickname}?`,
      async () => {
        setActing(trade.id);
        try {
          await apiCancelTrade(trade.id, user.id);
          await load();
        } catch (e) {
          showAlert('Error', e instanceof Error ? e.message : 'Error al retirar la propuesta');
        } finally { setActing(null); }
      },
      { confirmLabel: 'Retirar', destructive: true },
    );
  };

  const handleConfirm = (trade: TradeData, accept: boolean) => {
    if (!accept) {
      showConfirm(
        'Cancelar intercambio',
        '¿Seguro que quieres cancelar este intercambio?',
        async () => {
          setActing(trade.id);
          try {
            await apiConfirmTrade(trade.id, user.id, false);
            await load();
          } catch (e) {
            showAlert('Error', e instanceof Error ? e.message : 'Error al cancelar');
          } finally { setActing(null); }
        },
        { confirmLabel: 'Cancelar intercambio', destructive: true },
      );
    } else {
      showConfirm(
        'Confirmar intercambio',
        `¿Aceptas intercambiar tu carta por la de ${trade.receiver.nickname}?`,
        async () => {
          setActing(trade.id);
          try {
            await apiConfirmTrade(trade.id, user.id, true);
            await load();
          } catch (e) {
            showAlert('Error', e instanceof Error ? e.message : 'Error al confirmar');
          } finally { setActing(null); }
        },
        { confirmLabel: 'Confirmar' },
      );
    }
  };

  const hasActiveAsInitiator = active.some(t => t.initiator.id === user.id);

  return (
    <SafeAreaView style={styles.root}>
      
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={Colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Intercambios</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >

{active.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>En curso</Text>
              {active.map(t => (
                <TradeCard
                  key={t.id}
                  trade={t}
                  userId={user.id}
                  ownedCardIds={ownedCardIds}
                  acting={acting === t.id}
                  onWithdraw={() => handleWithdraw(t)}
                  onReject={() => handleReject(t)}
                  onConfirm={(accept) => handleConfirm(t, accept)}
                  onRespond={() => router.push(`/trade/${t.id}/respond` as any)}
                />
              ))}
            </>
          )}

{active.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="swap-horizontal-outline" size={52} color={Colors.primaryLight} />
              <Text style={styles.emptyTitle}>Sin intercambios activos</Text>
              <Text style={styles.emptyDesc}>
                Propón un intercambio a un amigo pulsando el botón "+"
              </Text>
            </View>
          )}

{history.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Historial</Text>
              {history.map(t => (
                <TradeCard
                  key={t.id}
                  trade={t}
                  userId={user.id}
                  ownedCardIds={ownedCardIds}
                  acting={false}
                />
              ))}
            </>
          )}

          <View style={{ height: 96 }} />
        </ScrollView>
      )}

{!hasActiveAsInitiator && (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => router.push('/trade/new' as any)}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      )}

      <AppDialog {...dialogCfg} />
    </SafeAreaView>
  );
}

function TradeCard({
  trade, userId, ownedCardIds, acting, onWithdraw, onReject, onConfirm, onRespond,
}: {
  trade: TradeData;
  userId: number;
  ownedCardIds?: Set<number>;
  acting: boolean;
  onWithdraw?: () => void;
  onReject?: () => void;
  onConfirm?: (accept: boolean) => void;
  onRespond?: () => void;
}) {
  const iAmInitiator = trade.initiator.id === userId;
  const partner      = iAmInitiator ? trade.receiver : trade.initiator;
  const myCard       = iAmInitiator ? trade.initiatorCard : trade.receiverCard;
  const theirCard    = iAmInitiator ? trade.receiverCard  : trade.initiatorCard;
  const color        = statusColor(trade.status);
  const label        = statusLabel(trade.status, iAmInitiator);
  const active       = isActive(trade.status);

  return (
    <View style={[styles.tradeCard, !active && styles.tradeCardDone]}>
      
      <View style={[styles.statusBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>

<View style={styles.tradeBody}>

<View style={styles.partnerWrap}>
          <Image source={avatarUri(partner)} style={styles.partnerAvatar} />
          <Text style={styles.partnerNick} numberOfLines={1}>{partner.nickname}</Text>
        </View>

<View style={styles.cardsRow}>
          
          <View style={styles.cardSlot}>
            <Text style={styles.cardSlotLabel}>Tú ofreces</Text>
            {myCard ? (
              <CardCell card={myCard} owned width={CARD_W} />
            ) : (
              <View style={[styles.cardEmpty, { width: CARD_W, height: CARD_H }]}>
                <Ionicons name="help" size={18} color={Colors.border} />
              </View>
            )}
          </View>

          <Ionicons name="swap-horizontal" size={22} color={Colors.textLight} style={{ marginTop: 18 }} />

<View style={styles.cardSlot}>
            <Text style={styles.cardSlotLabel}>Recibes</Text>
            {theirCard ? (
              <View style={{ position: 'relative' }}>
                <CardCell card={theirCard} owned width={CARD_W} />
                {ownedCardIds && !ownedCardIds.has(theirCard.id) && (
                  <View style={styles.newBadge} pointerEvents="none">
                    <Ionicons name="sparkles" size={8} color="#fff" />
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.cardEmpty, { width: CARD_W, height: CARD_H }]}>
                <Ionicons name="help" size={18} color={Colors.border} />
              </View>
            )}
          </View>
        </View>
      </View>

{acting ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 4 }} />
      ) : (
        <>
          
          {iAmInitiator && trade.status === 'PENDING_RESPONSE' && (
            <View style={styles.actionRow}>
              <Pressable style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={onWithdraw}>
                <Text style={styles.actionBtnSecondaryText}>Retirar propuesta</Text>
              </Pressable>
            </View>
          )}

{!iAmInitiator && trade.status === 'PENDING_RESPONSE' && (
            <View style={styles.actionRow}>
              <Pressable style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={onReject}>
                <Text style={styles.actionBtnSecondaryText}>Rechazar</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={onRespond}>
                <Text style={styles.actionBtnPrimaryText}>Responder</Text>
              </Pressable>
            </View>
          )}

{iAmInitiator && trade.status === 'PENDING_CONFIRMATION' && (
            <View style={styles.actionRow}>
              <Pressable style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => onConfirm?.(false)}>
                <Text style={styles.actionBtnSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => onConfirm?.(true)}>
                <Text style={styles.actionBtnPrimaryText}>¡Aceptar!</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
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
  backBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },

  scroll: { padding: 16, gap: 10 },

  sectionLabel: {
    fontSize: 12, fontWeight: '800', color: Colors.textLight,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2,
  },

  emptyBox:  { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  emptyDesc:  { fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 19 },

  tradeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.border,
    padding: 14, gap: 12,
  },
  tradeCardDone: { opacity: 0.75 },

  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  statusText: { fontSize: 12, fontWeight: '700' },

  tradeBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },

  partnerWrap: { alignItems: 'center', gap: 5, width: 56 },
  partnerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.primaryLight,
  },
  partnerNick: { fontSize: 11, fontWeight: '600', color: Colors.textMid, textAlign: 'center' },

  cardsRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 12 },
  cardSlot:  { alignItems: 'center', gap: 4 },
  cardSlotLabel: { fontSize: 10, fontWeight: '600', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardEmpty: {
    borderRadius: 6, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },

  newBadge: {
    position: 'absolute', top: -7, right: -7,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#16A34A',
    borderRadius: 20, paddingHorizontal: 6, paddingVertical: 3,
    transform: [{ rotate: '10deg' }], zIndex: 20, elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4,
  },
  newBadgeText: { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },

  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  actionBtnPrimary:      { backgroundColor: Colors.primary },
  actionBtnSecondary:    { backgroundColor: Colors.primaryLight, borderWidth: 1.5, borderColor: Colors.border },
  actionBtnPrimaryText:  { fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'center' },
  actionBtnSecondaryText:{ fontSize: 14, fontWeight: '700', color: Colors.textMid, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  fabPressed: { opacity: 0.85 },
});
