import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Colors } from '../constants/colors';
import GameBanner from '../components/GameBanner';

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootStack />
    </AuthProvider>
  );
}

function RootStack() {
  const { levelUpInfo, clearLevelUp } = useAuth();

  return (
    <>
      <Stack>
        <Stack.Screen name="index"         options={{ headerShown: false }} />
        <Stack.Screen name="auth"          options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
        <Stack.Screen name="profile"       options={{ headerShown: false }} />
        <Stack.Screen name="missions"      options={{ headerShown: false }} />
        <Stack.Screen name="decks"         options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="deck/new"      options={{ headerShown: false }} />
        <Stack.Screen name="deck/[id]"     options={{ headerShown: false }} />
        <Stack.Screen name="shop"             options={{ headerShown: false }} />
        <Stack.Screen name="trades"           options={{ headerShown: false }} />
        <Stack.Screen name="trade/new"        options={{ headerShown: false }} />
        <Stack.Screen name="trade/[id]/respond" options={{ headerShown: false }} />
        <Stack.Screen name="game"             options={{ headerShown: false }} />
        <Stack.Screen name="game/[id]"        options={{ headerShown: false }} />
      </Stack>

      {/* Banner global de invitaciones a partida */}
      <GameBanner />

      {/* Modal de subida de nivel — aparece sobre cualquier pantalla */}
      <Modal
        visible={levelUpInfo !== null}
        transparent
        animationType="fade"
        onRequestClose={clearLevelUp}
      >
        <View style={s.overlay}>
          <View style={s.card}>
            {/* Estrellas decorativas */}
            <View style={s.starsRow}>
              <Ionicons name="star" size={20} color="#F59E0B" />
              <Ionicons name="star" size={28} color="#F59E0B" />
              <Ionicons name="star" size={20} color="#F59E0B" />
            </View>

            {/* Icono trofeo */}
            <View style={s.trophyWrap}>
              <Ionicons name="trophy" size={52} color="#F59E0B" />
            </View>

            {/* Título */}
            <Text style={s.title}>¡Enhorabuena!</Text>
            <Text style={s.subtitle}>Has subido de nivel</Text>

            {/* Nivel nuevo */}
            <View style={s.levelBadge}>
              <Text style={s.levelLabel}>NIVEL</Text>
              <Text style={s.levelNumber}>{levelUpInfo?.newLevel}</Text>
            </View>

            {/* Descripción */}
            <Text style={s.description}>
              Has pasado del nivel {levelUpInfo?.previousLevel} al nivel{' '}
              {levelUpInfo?.newLevel}. ¡Sigue así!
            </Text>

            {/* Botón cerrar */}
            <Pressable style={s.btn} onPress={clearLevelUp}>
              <Text style={s.btnText}>¡Genial!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const GOLD = '#F59E0B';

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },

  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },

  trophyWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: GOLD,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMid,
    textAlign: 'center',
    marginTop: -4,
  },

  levelBadge: {
    backgroundColor: GOLD,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 10,
    alignItems: 'center',
    marginVertical: 4,
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  levelNumber: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 46,
  },

  description: {
    fontSize: 14,
    color: Colors.textMid,
    textAlign: 'center',
    lineHeight: 20,
  },

  btn: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 13,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
