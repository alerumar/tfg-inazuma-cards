/**
 * GameBanner — banner flotante global para invitaciones a partida.
 *
 * Aparece en la parte inferior de la pantalla cuando el usuario tiene
 * una invitación pendiente. Permite aceptar/rechazar directamente o
 * navegar a la pantalla de la partida.
 *
 * Solo se muestra si el usuario NO está ya en una pantalla game/[id].
 * Si la invitación desaparece sin que el usuario haya respondido
 * (el invitador la canceló), muestra brevemente "Reto cancelado".
 */
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { BASE_URL } from '../constants/api';
import { useAuth } from '../context/AuthContext';
import { apiGetPendingInvites, apiRespondInvite } from '../services/matchService';
import { MatchResponse } from '../types/match';

export default function GameBanner() {
  const { user, pendingGameInvites, refreshBadges } = useAuth();
  const router  = useRouter();
  const path    = usePathname();
  const insets  = useSafeAreaInsets();

  const [invite,    setInvite]    = useState<MatchResponse | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const slideAnim                 = useRef(new Animated.Value(120)).current;

  // Refs para evitar condiciones de carrera en los efectos
  const inviteRef    = useRef<MatchResponse | null>(null);
  const respondedRef = useRef(false);
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // No mostrar si ya estamos en la pantalla de partida
  const isOnGameScreen = path.startsWith('/game/');

  const hide = useCallback(() => {
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    inviteRef.current = null;
    Animated.timing(slideAnim, {
      toValue: 120, duration: 220, useNativeDriver: true,
    }).start(() => {
      setInvite(null);
      setCancelled(false);
      respondedRef.current = false;
    });
  }, [slideAnim]);

  const show = useCallback((m: MatchResponse) => {
    inviteRef.current    = m;
    respondedRef.current = false;
    setCancelled(false);
    setInvite(m);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true,
      tension: 60, friction: 12,
    }).start();
  }, [slideAnim]);

  // Reacciona al contador de invitaciones pendientes
  useEffect(() => {
    if (!user || isOnGameScreen) {
      hide();
      return;
    }

    if (pendingGameInvites === 0) {
      // Si el banner está activo y el usuario NO respondió → el invitador canceló
      if (inviteRef.current !== null && !respondedRef.current) {
        setCancelled(true);
        // Deslizar hacia arriba tras 2 s
        cancelTimerRef.current = setTimeout(() => hide(), 2000);
      } else {
        hide();
      }
      return;
    }

    // Hay invitaciones → mostrar la primera
    apiGetPendingInvites(user.id)
      .then(list => { if (list.length > 0) show(list[0]); else hide(); })
      .catch(() => hide());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGameInvites, isOnGameScreen]);

  const handleAccept = async () => {
    if (!invite || !user || loading) return;
    respondedRef.current = true;
    setLoading(true);
    try {
      await apiRespondInvite(invite.id, user.id, true);
      refreshBadges();
      hide();
      router.push(`/game/${invite.id}` as any);
    } catch {
      refreshBadges();
      hide();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!invite || !user || loading) return;
    respondedRef.current = true;
    setLoading(true);
    try {
      await apiRespondInvite(invite.id, user.id, false);
    } catch { /* silent */ } finally {
      refreshBadges();
      hide();
      setLoading(false);
    }
  };

  const handleTap = () => {
    if (!invite || cancelled) return;
    router.push(`/game/${invite.id}` as any);
  };

  if (!invite) return null;

  const initiator = invite.player1;
  const avatarUri = initiator.profilePhoto
    ? `${BASE_URL}${initiator.profilePhoto}`
    : null;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: insets.bottom + 72, transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents="box-none"
    >
      <Pressable style={[styles.card, cancelled && styles.cardCancelled]} onPress={handleTap}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={[styles.avatar, cancelled && styles.avatarCancelled]} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, cancelled && styles.avatarCancelled]}>
              <Ionicons name="person" size={22} color={cancelled ? Colors.textLight : Colors.primary} />
            </View>
          )}
          {cancelled && (
            <View style={styles.cancelledBadge}>
              <Ionicons name="close" size={10} color="#fff" />
            </View>
          )}
        </View>

        {/* Texto */}
        <View style={styles.textWrap}>
          {cancelled ? (
            <>
              <Text style={styles.cancelledTitle}>Reto cancelado</Text>
              <Text style={styles.cancelledSub} numberOfLines={1}>
                <Text style={styles.nick}>{initiator.nickname}</Text>
                {' '}canceló la invitación
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title} numberOfLines={1}>¡Te han retado!</Text>
              <Text style={styles.sub} numberOfLines={1}>
                <Text style={styles.nick}>{initiator.nickname}</Text>
                {' '}quiere jugar contigo
              </Text>
            </>
          )}
        </View>

        {/* Botones — solo si no está cancelado */}
        {!cancelled && (
          <View style={styles.btnRow}>
            <Pressable
              style={[styles.btn, styles.btnReject]}
              onPress={handleReject}
              disabled={loading}
            >
              <Ionicons name="close" size={18} color="#EF4444" />
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnAccept]}
              onPress={handleAccept}
              disabled={loading}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
            </Pressable>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cardCancelled: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },

  avatarWrap: { position: 'relative' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarCancelled: {
    borderColor: '#FCA5A5',
    opacity: 0.6,
  },
  avatarFallback: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },

  textWrap: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textDark,
  },
  sub: {
    fontSize: 12,
    color: Colors.textMid,
    marginTop: 1,
  },
  nick: {
    fontWeight: '700',
    color: Colors.primary,
  },
  cancelledTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  cancelledSub: {
    fontSize: 12,
    color: Colors.textMid,
    marginTop: 1,
  },

  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnReject: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  btnAccept: {
    backgroundColor: Colors.primary,
  },
});
