import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { BASE_URL } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';

const IMG = (path: string) => ({ uri: `${BASE_URL}/images/${encodeURIComponent(path)}` });

const PACK_IE  = IMG('Sobre normal.jpg');
const PACK_GO  = IMG('Sobre GO.jpg');
const SHOP_IMG = IMG('Tienda.jpg');

export default function HomeScreen() {
  const { user } = useAuth();
  const router   = useRouter();

  const avatarUri = user?.profilePhoto
    ? { uri: `${BASE_URL}${user.profilePhoto}` }
    : IMG('default_profile.png');

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn}>
          <Ionicons name="settings-outline" size={28} color={Colors.textDark} />
        </Pressable>

        <Pressable onPress={() => router.push('/profile')}>
          <Image source={avatarUri} style={styles.avatar} />
        </Pressable>

        <Pressable style={styles.pointsBadge}>
          <Ionicons name="hourglass-outline" size={16} color={Colors.primary} />
          <Text style={styles.pointsText}>{user?.packPoints ?? 0}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Sobres ─────────────────────────────────────────────── */}
        <View style={styles.packsRow}>
          <PackCard
            title="Inazuma Eleven"
            image={PACK_IE}
            onPress={() => { /* abrir sobre */ }}
          />
          <PackCard
            title="Inazuma Eleven GO"
            image={PACK_GO}
            onPress={() => { /* abrir sobre */ }}
          />
        </View>

        {/* ── Tienda ─────────────────────────────────────────────── */}
        <Pressable style={styles.shopCard} onPress={() => { /* ir a tienda */ }}>
          <View style={styles.shopLeft}>
            <Ionicons name="bag-handle-outline" size={44} color={Colors.primary} />
            <Text style={styles.shopLabel}>Tienda</Text>
          </View>
          <Image source={SHOP_IMG} style={styles.shopImage} resizeMode="contain" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── PackCard ────────────────────────────────────────────────────────────────

function PackCard({
  title,
  image,
  onPress,
}: {
  title: string;
  image: { uri: string };
  onPress: () => void;
}) {
  return (
    <View style={styles.packCard}>
      <Image source={image} style={styles.packImage} resizeMode="cover" />
      <Text style={styles.packTitle} numberOfLines={1}>{title}</Text>
      <Pressable style={styles.openBtn} onPress={onPress}>
        <Text style={styles.openBtnText}>Abrir</Text>
      </Pressable>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
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

  // Scroll
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 20,
  },

  // Packs
  packsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  packCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  packImage: {
    width: '100%',
    aspectRatio: 0.7,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  packTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  openBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  openBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
  },

  // Shop
  shopCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    height: 200,
  },
  shopLeft: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingLeft: 16,
  },
  shopLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  shopImage: {
    width: '60%',
    height: '100%',
  },
});
