import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { AppDialog, useDialog } from '../../components/AppDialog';
import { AppHeader } from '../../components/AppHeader';
import { PackOpenModal } from '../../components/PackOpenModal';
import { BASE_URL } from '../../constants/api';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { apiGetPerson } from '../../services/authService';
import { apiGetPackStatus, apiOpenFreePack, apiOpenPackWithPoints } from '../../services/packService';
import { PackCardResult, PackStatus, PackType } from '../../types/packs';

const IMG  = (path: string) => ({ uri: `${BASE_URL}/images/${encodeURIComponent(path)}` });
const PACK_IE   = IMG('Sobre normal.jpg');
const PACK_GO   = IMG('Sobre GO.jpg');
const SHOP_IMG  = IMG('Tienda.jpg');
const MAX_PACKS = 3;

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return 'Disponible';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, updateUser, dailyRewardAvailable } = useAuth();
  const { dialogCfg, showAlert, showConfirm } = useDialog();

  const [status,        setStatus]        = useState<PackStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [opening,       setOpening]       = useState(false);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [cards,         setCards]         = useState<PackCardResult[]>([]);
  const [openPackType,  setOpenPackType]  = useState<PackType | null>(null);
  const [localMinutes,  setLocalMinutes]  = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

const fetchStatus = useCallback(() => {
    if (!user) return;
    apiGetPackStatus(user.id)
      .then(s => {
        setStatus(s);
        setLocalMinutes(s.minutesUntilNextPack);
      })
      .catch(e => console.warn('Error al cargar estado sobres', e))
      .finally(() => setStatusLoading(false));
  }, [user?.id]);

  useFocusEffect(fetchStatus);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (localMinutes === null || localMinutes <= 0) return;

    timerRef.current = setInterval(() => {
      setLocalMinutes(prev => {
        if (prev === null || prev <= 1) {
          fetchStatus(); 
          return 0;
        }
        return prev - 1;
      });
    }, 60_000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [localMinutes]);

const doOpenPack = async (type: PackType) => {
    if (!user || !status) return;
    setOpening(true);

    const usingPoints = status.accumulatedPacks === 0;
    if (usingPoints) {
      setStatus(prev => prev ? { ...prev, packPoints: prev.packPoints - localCost } : prev);
      updateUser({ ...user, packPoints: user.packPoints - localCost });
    } else {
      setStatus(prev => prev ? { ...prev, accumulatedPacks: prev.accumulatedPacks - 1 } : prev);
    }

    try {
      const result = usingPoints
        ? await apiOpenPackWithPoints(user.id, type)
        : await apiOpenFreePack(user.id, type);

      setCards(result.cards);
      setOpenPackType(type);
      setModalVisible(true);
    } catch (e: unknown) {
      fetchStatus();
      showAlert('Error', e instanceof Error ? e.message : 'Error al abrir el sobre');
    } finally {
      setOpening(false);
    }
  };

  const handleOpen = (type: PackType) => {
    if (!user || !status) return;

    if (status.accumulatedPacks === 0) {
      showConfirm(
        '¿Canjear puntos?',
        `¿Seguro que quieres gastar ${localCost} punto${localCost !== 1 ? 's' : ''} para abrir este sobre?`,
        () => doOpenPack(type),
        { confirmLabel: 'Abrir sobre' },
      );
      return;
    }

    doOpenPack(type);
  };

  const handleFinish = async () => {
    setModalVisible(false);
    setCards([]);  
    fetchStatus();
    if (user) {
      try {
        const updated = await apiGetPerson(user.id);
        await updateUser(updated);
      } catch {}
    }
  };

const localCost = (status && status.accumulatedPacks === 0)
    ? Math.max(1, Math.min(12, Math.ceil((localMinutes ?? 0) / 30)))
    : 0;

  const canOpen = status
    ? status.accumulatedPacks > 0 || status.packPoints >= localCost
    : false;

  const openLabel = () => {
    if (!status) return 'Abrir';
    if (status.accumulatedPacks > 0) return 'Abrir sobre';
    return `Abrir (${localCost} pts)`;
  };

  return (
    <SafeAreaView style={styles.root}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchStatus(); setRefreshing(false); }}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >

<View style={styles.packSection}>

<View style={styles.packImagesRow}>
            {([
              { title: 'Inazuma Eleven',    image: PACK_IE, type: 'INAZUMA_ELEVEN'    as PackType },
              { title: 'Inazuma Eleven GO', image: PACK_GO, type: 'INAZUMA_ELEVEN_GO' as PackType },
            ] as const).map(pack => (
              <View key={pack.type} style={styles.packImageWrap}>
                <Image source={pack.image} style={styles.packImage} resizeMode="cover" />
                <Text style={styles.packTitle} numberOfLines={1}>{pack.title}</Text>
              </View>
            ))}
          </View>

<View style={styles.packBtnsRow}>
            {(['INAZUMA_ELEVEN', 'INAZUMA_ELEVEN_GO'] as PackType[]).map(type => (
              <Pressable
                key={type}
                style={[
                  styles.openBtn,
                  (!canOpen || opening) && styles.openBtnDisabled,
                ]}
                onPress={() => handleOpen(type)}
                disabled={!canOpen || opening}
              >
                {opening
                  ? <ActivityIndicator size={16} color="#fff" />
                  : (
                    <>
                      <Ionicons name="gift-outline" size={15} color={canOpen ? '#fff' : Colors.textLight} />
                      <Text style={[styles.openBtnText, !canOpen && styles.openBtnTextDisabled]}>
                        {openLabel()}
                      </Text>
                    </>
                  )}
              </Pressable>
            ))}
          </View>

<View style={styles.statusCard}>
            {statusLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : status ? (
              <>
                
                <View style={styles.statusRow}>
                  <View style={styles.dotsWrap}>
                    {Array.from({ length: MAX_PACKS }, (_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.packDot,
                          i < status.accumulatedPacks && styles.packDotFull,
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.statusPackText}>
                    {status.accumulatedPacks}/{MAX_PACKS} sobres gratis
                  </Text>
                </View>

<View style={styles.statusRow}>
                  <Ionicons
                    name={status.accumulatedPacks >= MAX_PACKS ? 'checkmark-circle' : 'time-outline'}
                    size={15}
                    color={status.accumulatedPacks >= MAX_PACKS ? '#22C55E' : Colors.textLight}
                  />
                  <Text style={[
                    styles.statusTimerText,
                    status.accumulatedPacks >= MAX_PACKS && styles.statusTimerFull,
                  ]}>
                    {status.accumulatedPacks >= MAX_PACKS
                      ? '¡Máximo alcanzado!'
                      : localMinutes === 0
                        ? '¡Nuevo sobre disponible!'
                        : `Próximo sobre en ${formatMinutes(localMinutes ?? status.minutesUntilNextPack)}`}
                  </Text>
                </View>

{status.accumulatedPacks === 0 && (
                  <>
                    <View style={styles.statusRow}>
                      <Ionicons name="hourglass-outline" size={14} color="#F59E0B" />
                      <Text style={styles.statusPointsText}>
                        Coste ahora:{' '}
                        <Text style={styles.statusPointsBold}>{localCost} pts</Text>
                        <Text style={styles.statusPointsHint}> · baja con el tiempo</Text>
                      </Text>
                    </View>
                    <View style={styles.statusRow}>
                      <Ionicons name="hourglass-outline" size={14} color={status.packPoints >= localCost ? '#22C55E' : '#EF4444'} />
                      <Text style={styles.statusPointsText}>
                        Tus puntos:{' '}
                        <Text style={[
                          styles.statusPointsBold,
                          { color: status.packPoints >= localCost ? '#22C55E' : '#EF4444' },
                        ]}>
                          {status.packPoints}
                        </Text>
                        {status.packPoints < localCost && (
                          <Text style={styles.statusPointsWarn}> (te faltan {localCost - status.packPoints})</Text>
                        )}
                      </Text>
                    </View>
                  </>
                )}
              </>
            ) : null}
          </View>

        </View>

<Pressable style={styles.shopCard} onPress={() => router.push('/shop')}>
          <View style={styles.shopLeft}>
            <Ionicons name="bag-handle-outline" size={44} color={Colors.primary} />
            <Text style={styles.shopLabel}>Tienda</Text>
          </View>
          <Image source={SHOP_IMG} style={styles.shopImage} resizeMode="contain" />
          {dailyRewardAvailable && <View style={styles.shopDot} />}
        </Pressable>

      </ScrollView>

<PackOpenModal
        visible={modalVisible}
        cards={cards}
        packType={openPackType}
        onFinish={handleFinish}
      />

      <AppDialog {...dialogCfg} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 24, gap: 20 },

  packSection:    { gap: 12 },
  packImagesRow:  { flexDirection: 'row', gap: 12 },
  packImageWrap:  { flex: 1, alignItems: 'center', gap: 6 },
  packImage: {
    width: '100%', aspectRatio: 0.7,
    borderRadius: 12, backgroundColor: Colors.primaryLight,
  },
  packTitle: { fontSize: 12, fontWeight: '600', color: Colors.primary, textAlign: 'center' },

  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 7,
    alignItems: 'flex-start',
  },
  statusRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dotsWrap:          { flexDirection: 'row', gap: 5 },
  packDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  packDotFull:       { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statusPackText:    { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  statusTimerText:   { fontSize: 12, color: Colors.textLight },
  statusTimerFull:   { color: '#22C55E', fontWeight: '700' },
  statusPointsText:  { fontSize: 12, color: Colors.textMid },
  statusPointsBold:  { fontWeight: '800', color: Colors.textDark },
  statusPointsWarn:  { color: '#EF4444' },
  statusPointsHint:  { color: Colors.textLight, fontStyle: 'italic' },

  packBtnsRow: { flexDirection: 'row', gap: 12 },
  openBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 11,
  },
  openBtnDisabled:      { backgroundColor: Colors.primaryLight },
  openBtnText:          { fontSize: 13, fontWeight: '700', color: '#fff' },
  openBtnTextDisabled:  { color: Colors.textLight },

  shopCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    height: 180,
  },
  shopLeft: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingLeft: 16,
  },
  shopLabel: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  shopImage: { width: '60%', height: '100%' },

  shopDot: {
    position: 'absolute',
    top: 12, right: 12,
    width: 14, height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
});
