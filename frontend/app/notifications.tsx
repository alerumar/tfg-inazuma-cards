import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../constants/api';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import {
  apiGetNotifications,
  apiMarkAllRead,
} from '../services/notificationService';
import { NotificationData, NotificationType } from '../types/notifications';

// ── Icono y color por tipo ────────────────────────────────────────────────────
const TYPE_ICON: Record<NotificationType, React.ComponentProps<typeof Ionicons>['name']> = {
  FRIEND_REQUEST_ACCEPTED: 'person-add',
  FRIEND_REQUEST_REJECTED: 'person-remove-outline',
  TRADE_COMPLETED:         'checkmark-done-circle',
  TRADE_REJECTED:          'close-circle-outline',
  TRADE_CANCELLED:         'ban-outline',
  TRADE_WITHDRAWN:         'arrow-undo-circle-outline',
};

const TYPE_COLOR: Record<NotificationType, string> = {
  FRIEND_REQUEST_ACCEPTED: '#22C55E',
  FRIEND_REQUEST_REJECTED: '#EF4444',
  TRADE_COMPLETED:         '#3B82F6',
  TRADE_REJECTED:          '#EF4444',
  TRADE_CANCELLED:         '#9E9E9E',
  TRADE_WITHDRAWN:         '#F59E0B',
};

// ── Tiempo relativo ───────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const date    = new Date(dateStr);
  const diffMs  = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return `Hace ${diffD}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ── Pantalla ──────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const router                                = useRouter();
  const { user, setUnreadNotifications }      = useAuth();
  const [notifications, setNotifications]     = useState<NotificationData[]>([]);
  const [loading,       setLoading]           = useState(true);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    setLoading(true);
    // Cargar notificaciones y marcar todas como leídas en paralelo
    const EXCLUDED = ['GAME_INVITE', 'GAME_INVITE_ACCEPTED', 'GAME_INVITE_REJECTED'];
    Promise.all([
      apiGetNotifications(user.id),
      apiMarkAllRead(user.id),
    ])
      .then(([data]) => {
        setNotifications(data.filter(n => !EXCLUDED.includes(n.type)));
        setUnreadNotifications(0); // actualizar badge inmediatamente
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [user?.id]));

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={Colors.textDark} />
        </Pressable>
        <Text style={styles.title}>Notificaciones</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-outline" size={56} color={Colors.primaryLight} />
          <Text style={styles.emptyTitle}>Sin notificaciones</Text>
          <Text style={styles.emptyDesc}>
            Aquí aparecerán tus notificaciones de amistad y otras actividades
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map(n => (
            <NotificationCard key={n.id} notification={n} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Tarjeta de notificación ───────────────────────────────────────────────────
function NotificationCard({ notification: n }: { notification: NotificationData }) {
  const icon  = TYPE_ICON[n.type]  ?? 'notifications-outline';
  const color = TYPE_COLOR[n.type] ?? Colors.primary;

  const avatarUri = n.actorProfilePhoto
    ? { uri: `${BASE_URL}${n.actorProfilePhoto}` }
    : { uri: `${BASE_URL}/images/default_profile.png` };

  return (
    <View style={[styles.card, !n.read && styles.cardUnread]}>
      {/* Barra lateral de no leída */}
      {!n.read && <View style={styles.unreadBar} />}

      {/* Avatar del actor */}
      <View style={styles.avatarWrap}>
        <Image source={avatarUri} style={styles.avatar} />
        {/* Icono de tipo sobre el avatar */}
        <View style={[styles.typeBadge, { backgroundColor: color }]}>
          <Ionicons name={icon} size={10} color="#fff" />
        </View>
      </View>

      {/* Texto */}
      <View style={styles.textBlock}>
        <Text style={[styles.message, !n.read && styles.messageUnread]}>
          {n.message}
        </Text>
        <Text style={styles.time}>{timeAgo(n.createdAt)}</Text>
      </View>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title:   { fontSize: 18, fontWeight: '700', color: Colors.textDark },

  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  emptyDesc:  { fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 19 },

  list: { padding: 16, gap: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    overflow: 'hidden',
  },
  cardUnread: {
    backgroundColor: '#FFF0F1',
    borderColor: Colors.primary,
  },

  // Barra izquierda de "no leída"
  unreadBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  // Avatar + badge de tipo
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2, borderColor: Colors.border,
  },
  typeBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },

  // Texto
  textBlock:    { flex: 1, gap: 4 },
  message:      { fontSize: 14, color: Colors.textMid, lineHeight: 19 },
  messageUnread:{ color: Colors.textDark, fontWeight: '600' },
  time:         { fontSize: 11, color: Colors.textLight },
});
