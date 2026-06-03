/**
 * shop.tsx — Tienda
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppDialog, useDialog } from '../components/AppDialog';
import { RewardItem, RewardModal } from '../components/RewardModal';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { apiGetPerson } from '../services/authService';
import { apiClaimDailyReward, apiGetPackStatus } from '../services/packService';
import { PackStatus } from '../types/packs';
import { PersonResponse } from '../types/auth';

const DAILY_POINTS = 6;

/** Devuelve la marca de tiempo (ms) de la próxima 9:00 desde ahora. */
function nextNineAM(): number {
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
  if (now.getHours() >= 9) next.setDate(next.getDate() + 1);
  return next.getTime();
}

/** Devuelve { h, m } que faltan hasta `targetMs`. */
function timeLeft(targetMs: number): { h: number; m: number } {
  const diffMs = Math.max(0, targetMs - Date.now());
  const totalM = Math.floor(diffMs / 60_000);
  return { h: Math.floor(totalM / 60), m: totalM % 60 };
}

export default function ShopScreen() {
  const router               = useRouter();
  const { user, updateUser, refreshBadges } = useAuth();
  const { dialogCfg, showAlert } = useDialog();

  const [status,        setStatus]        = useState<PackStatus | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [claiming,      setClaiming]      = useState(false);

  // Modal de recompensa — se muestra ANTES del modal de nivel
  const [rewardVisible, setRewardVisible] = useState(false);
  const [rewardItems,   setRewardItems]   = useState<RewardItem[]>([]);
  const [pendingUser,   setPendingUser]   = useState<PersonResponse | null>(null);

  // Objetivo fijo: próxima 9:00 — se recalcula al enfocar la pantalla
  const targetRef = useRef<number>(nextNineAM());
  // Tick para forzar re-render cada 60 s
  const [, setTick] = useState(0);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Carga de estado ──────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    if (!user) return;
    try {
      const s = await apiGetPackStatus(user.id);
      setStatus(s);
    } catch (e) {
      console.warn('Error al cargar estado tienda', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    // Al enfocar, recalculamos la próxima 9:00 y cargamos estado
    targetRef.current = nextNineAM();
    setTick(t => t + 1); // re-render para mostrar tiempo actualizado
    fetchStatus();
  }, [fetchStatus]));

  // Interval de 60 s: decrementa el contador un minuto
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      // Si ya pasamos la 9:00, recalcular para el día siguiente
      if (Date.now() >= targetRef.current) {
        targetRef.current = nextNineAM();
        fetchStatus();
      }
      setTick(t => t + 1);
    }, 60_000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchStatus]);

  // ── Reclamar ─────────────────────────────────────────────────────────────────
  const handleClaim = async () => {
    if (!user || !status?.dailyRewardAvailable || claiming) return;
    setClaiming(true);
    try {
      const pts     = await apiClaimDailyReward(user.id);
      const updated = await apiGetPerson(user.id);

      // Guardamos el usuario actualizado para aplicarlo al cerrar el modal
      setPendingUser(updated);
      setRewardItems([{
        icon:  'hourglass-outline',
        label: 'puntos abre-sobre',
        value: `+${pts}`,
        color: Colors.primary,
      }]);
      setRewardVisible(true);
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al reclamar la recompensa');
    } finally {
      setClaiming(false);
    }
  };

  // Al cerrar el modal: actualiza usuario (puede disparar modal de nivel) y refresca estado
  const handleRewardClose = async () => {
    setRewardVisible(false);
    if (pendingUser) {
      await updateUser(pendingUser);
      setPendingUser(null);
    }
    await fetchStatus();
    refreshBadges(); // actualiza el badge de la pestaña de inicio al instante
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const dailyAvailable             = status?.dailyRewardAvailable ?? false;
  const { h: countdownH, m: countdownM } = timeLeft(targetRef.current);

  return (
    <SafeAreaView style={styles.root}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={Colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Tienda</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Recompensa diaria ───────────────────────────────────── */}
        <View style={[styles.rewardCard, dailyAvailable ? styles.rewardCardActive : styles.rewardCardDone]}>

          {/* Icono + título */}
          <View style={styles.rewardHeader}>
            <View style={[styles.rewardIconWrap, dailyAvailable ? styles.rewardIconWrapActive : styles.rewardIconWrapDone]}>
              <Ionicons
                name={dailyAvailable ? 'gift' : 'gift-outline'}
                size={32}
                color={dailyAvailable ? '#fff' : Colors.textLight}
              />
            </View>
            <View style={styles.rewardTitleBlock}>
              <Text style={[styles.rewardTitle, !dailyAvailable && styles.rewardTitleDone]}>
                Recompensa diaria
              </Text>
              <Text style={styles.rewardSub}>
                {dailyAvailable ? 'Disponible ahora' : 'Ya reclamada hoy'}
              </Text>
            </View>
          </View>

          <View style={styles.rewardDivider} />

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 8 }} />
          ) : dailyAvailable ? (
            /* ── Disponible: muestra el premio y el botón ── */
            <View style={styles.prizeRow}>
              <Ionicons name="hourglass-outline" size={18} color={Colors.primary} />
              <Text style={styles.prizeText}>
                +{DAILY_POINTS}{' '}
                <Text style={styles.prizeLabel}>puntos abre-sobre</Text>
              </Text>
            </View>
          ) : null}

          {!loading && dailyAvailable && (
            <Pressable
              style={({ pressed }) => [styles.claimBtn, pressed && styles.claimBtnPressed]}
              onPress={handleClaim}
              disabled={claiming}
            >
              {claiming
                ? <ActivityIndicator color="#fff" size={18} />
                : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.claimBtnText}>¡Reclamar ahora!</Text>
                  </>
                )}
            </Pressable>
          )}

          <View style={styles.rewardDivider} />

          {/* ── Cuenta atrás SIEMPRE visible ── */}
          <View style={styles.countdownSection}>
            <Text style={styles.countdownLabel}>
              {dailyAvailable ? 'Próximo reset en' : 'Próxima recompensa en'}
            </Text>

            <View style={styles.countdownRow}>
              <View style={styles.countdownUnit}>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownNumber}>
                    {String(countdownH).padStart(2, '0')}
                  </Text>
                </View>
                <Text style={styles.countdownUnitLabel}>horas</Text>
              </View>

              <Text style={styles.countdownColon}>:</Text>

              <View style={styles.countdownUnit}>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownNumber}>
                    {String(countdownM).padStart(2, '0')}
                  </Text>
                </View>
                <Text style={styles.countdownUnitLabel}>minutos</Text>
              </View>
            </View>

            <View style={styles.resetHintRow}>
              <Ionicons name="refresh-outline" size={12} color={Colors.textLight} />
              <Text style={styles.resetHint}>Reinicio diario a las 9:00</Text>
            </View>
          </View>

        </View>

      </ScrollView>

      {/* Modal de recompensa — aparece antes del modal de nivel */}
      <RewardModal
        visible={rewardVisible}
        rewards={rewardItems}
        subtitle="Recompensa diaria reclamada"
        onClose={handleRewardClose}
      />
      <AppDialog {...dialogCfg} />
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  backBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textDark },

  rewardCard: { borderRadius: 20, borderWidth: 1.5, padding: 18, gap: 14 },
  rewardCardActive: { backgroundColor: Colors.surface, borderColor: Colors.primary },
  rewardCardDone:   { backgroundColor: Colors.surface, borderColor: Colors.border },

  rewardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rewardIconWrap:  { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rewardIconWrapActive: { backgroundColor: Colors.primary },
  rewardIconWrapDone:   { backgroundColor: Colors.primaryLight },

  rewardTitleBlock: { flex: 1, gap: 2 },
  rewardTitle:      { fontSize: 17, fontWeight: '800', color: Colors.textDark },
  rewardTitleDone:  { color: Colors.textMid },
  rewardSub:        { fontSize: 12, color: Colors.textLight },

  rewardDivider: { height: 1, backgroundColor: Colors.border },

  prizeRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prizeText:  { fontSize: 18, fontWeight: '900', color: Colors.textDark },
  prizeLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMid },

  claimBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 13,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  claimBtnPressed: { opacity: 0.85 },
  claimBtnText:    { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Cuenta atrás
  countdownSection: { alignItems: 'center', gap: 10 },
  countdownLabel:   { fontSize: 12, color: Colors.textLight, fontWeight: '600' },

  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  countdownUnit:  { alignItems: 'center', gap: 4 },
  countdownBox: {
    width: 52, height: 46, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  countdownNumber:    { fontSize: 22, fontWeight: '900', color: Colors.textDark },
  countdownUnitLabel: { fontSize: 10, fontWeight: '600', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  countdownColon:     { fontSize: 22, fontWeight: '900', color: Colors.border, marginBottom: 14 },

  resetHintRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  resetHint:    { fontSize: 11, color: Colors.textLight },
});
