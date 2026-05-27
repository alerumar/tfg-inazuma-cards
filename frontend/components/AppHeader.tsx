import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BASE_URL } from '../constants/api';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { apiGetMissions } from '../services/missionService';

interface Props {
  /** Tamaño del avatar en px (default 56) */
  avatarSize?: number;
}

export function AppHeader({ avatarSize = 56 }: Props) {
  const router          = useRouter();
  const { user }        = useAuth();
  const [open, setOpen] = useState(false);

  // ── Contadores de pendientes ────────────────────────────────────────────────
  const [claimable,     setClaimable]     = useState(0); // misiones completadas sin reclamar
  const unreadNotifications               = 0;           // placeholder hasta implementar notificaciones

  const refreshBadges = () => {
    if (!user) return;
    apiGetMissions(user.id)
      .then(ms => setClaimable(ms.filter(m => m.completed && !m.claimed).length))
      .catch(() => {});
  };

  useEffect(refreshBadges, [user?.id]);

  if (!user) return null;

  const hasMissionsPending      = claimable > 0;
  const hasNotificationsPending = unreadNotifications > 0;
  const hasAnyPending           = hasMissionsPending || hasNotificationsPending;

  const avatarUri = user.profilePhoto
    ? { uri: `${BASE_URL}${user.profilePhoto}` }
    : { uri: `${BASE_URL}/images/default_profile.png` };

  const go = (path: string) => { setOpen(false); router.push(path as any); };

  const handleOpenMenu = () => {
    refreshBadges(); // refrescar al abrir por si cambió algo
    setOpen(true);
  };

  return (
    <>
      {/* ── Barra ── */}
      <View style={styles.header}>

        {/* Botón hamburguesa con punto */}
        <Pressable style={styles.menuBtn} onPress={handleOpenMenu}>
          <Ionicons name="menu-outline" size={28} color={Colors.textDark} />
          {hasAnyPending && <View style={styles.btnDot} />}
        </Pressable>

        <Pressable onPress={() => router.push('/profile')}>
          <Image
            source={avatarUri}
            style={[
              styles.avatar,
              { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
            ]}
          />
        </Pressable>

        <View style={styles.pointsBadge}>
          <Ionicons name="hourglass-outline" size={16} color={Colors.primary} />
          <Text style={styles.pointsText}>{user.packPoints}</Text>
        </View>
      </View>

      {/* ── Modal de menú ── */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        {/* Tocar fuera cierra */}
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          {/* Evitar que tocar la tarjeta la cierre */}
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <MenuItem
              icon="trophy-outline"
              label="Misiones"
              dot={hasMissionsPending}
              onPress={() => go('/missions')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="layers-outline"
              label="Mis barajas"
              dot={false}
              onPress={() => go('/decks')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon="notifications-outline"
              label="Notificaciones"
              dot={hasNotificationsPending}
              onPress={() => go('/notifications')}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── Item de menú ──────────────────────────────────────────────────────────────

function MenuItem({
  icon, label, dot, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  dot: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      onPress={onPress}
    >
      {/* Icono con punto encima */}
      <View style={styles.menuIconContainer}>
        <View style={styles.menuIconWrap}>
          <Ionicons name={icon} size={28} color={Colors.primary} />
        </View>
        {dot && <View style={styles.iconDot} />}
      </View>

      <Text style={styles.menuLabel}>{label}</Text>

      {/* Punto a la derecha del label */}
      {dot && (
        <View style={styles.labelDot} />
      )}
    </Pressable>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const DOT_COLOR = '#EF4444'; // rojo

const styles = StyleSheet.create({
  // Header bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
  },
  menuBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Punto sobre el botón hamburguesa
  btnDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: DOT_COLOR,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },

  avatar: {
    borderWidth: 2.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  pointsText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textDark,
  },

  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    paddingTop: 72,
    paddingHorizontal: 16,
  },

  // Tarjeta del menú
  menuCard: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.primaryLight,
    marginHorizontal: 16,
  },

  // Ítem
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemPressed: {
    backgroundColor: Colors.surface,
  },

  // Icono con punto encima
  menuIconContainer: {
    position: 'relative',
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Punto sobre el icono del ítem
  iconDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: DOT_COLOR,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },

  menuLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    flex: 1,
  },

  // Punto a la derecha del label
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DOT_COLOR,
  },
});
