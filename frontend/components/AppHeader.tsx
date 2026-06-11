import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

export function AppHeader() {
  const router          = useRouter();
  const { user, unreadNotifications, claimableMissions } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const hasMissionsPending      = claimableMissions > 0;
  const hasNotificationsPending = unreadNotifications > 0;
  const hasAnyPending           = hasMissionsPending || hasNotificationsPending;

  const go = (path: string) => { setOpen(false); router.push(path as any); };

  const handleOpenMenu = () => setOpen(true);

  return (
    <>

      <View style={styles.header}>

<Pressable style={styles.menuBtn} onPress={handleOpenMenu}>
          <Ionicons name="menu-outline" size={28} color={Colors.textDark} />
          {hasAnyPending && <View style={styles.btnDot} />}
        </Pressable>

        <Pressable style={styles.avatar} onPress={() => router.push('/profile')}>
          {user.profilePhoto ? (
            <Image
              source={{ uri: `${BASE_URL}${user.profilePhoto}` }}
              style={styles.avatarImg}
              onError={() => {}}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color={Colors.primary} />
            </View>
          )}
        </Pressable>

        <View style={styles.pointsBadge}>
          <Ionicons name="hourglass-outline" size={16} color={Colors.primary} />
          <Text style={styles.pointsText}>{user.packPoints}</Text>
        </View>
      </View>

<Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          
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
      
      <View style={styles.menuIconContainer}>
        <View style={styles.menuIconWrap}>
          <Ionicons name={icon} size={28} color={Colors.primary} />
        </View>
        {dot && <View style={styles.iconDot} />}
      </View>

      <Text style={styles.menuLabel}>{label}</Text>

{dot && (
        <View style={styles.labelDot} />
      )}
    </Pressable>
  );
}

const DOT_COLOR = '#EF4444';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 72,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
  },
  menuBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

  // Pressable contenedor del avatar
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Image cuando hay foto real
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  // Placeholder cuando no hay foto
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    paddingTop: 72,
    paddingHorizontal: 16,
  },

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

  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DOT_COLOR,
  },
});
