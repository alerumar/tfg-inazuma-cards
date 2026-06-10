import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BASE_URL } from '../../constants/api';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

const BG_URI = `${BASE_URL}/images/Fondo_matches.png`;

export default function MatchesScreen() {
  const router = useRouter();
  const { pendingTrades } = useAuth();

  return (
    <ImageBackground
      source={{ uri: BG_URI }}
      style={styles.bg}
      resizeMode="cover"
    >
      
      <View style={styles.overlay} />

      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>

<View style={styles.titleBlock}>
          <Text style={styles.title}>Arena</Text>
          <Text style={styles.subtitle}>Juega contra tus amigos o intercambia cartas</Text>
        </View>

<View style={styles.buttonRow}>

<Pressable
            style={({ pressed }) => [styles.modeBtn, pressed && styles.modeBtnPressed]}
            onPress={() => router.push('/trades' as any)}
          >
            <View style={styles.modeIconWrap}>
              <Ionicons name="swap-horizontal" size={30} color="#fff" />
            </View>
            <Text style={styles.modeBtnTitle}>Intercambios</Text>
            <Text style={styles.modeBtnSub}>Intercambia cartas{'\n'}con otros jugadores</Text>
            {pendingTrades > 0 && <View style={styles.tradesDot} />}
          </Pressable>

<Pressable
            style={({ pressed }) => [styles.modeBtn, pressed && styles.modeBtnPressed]}
            onPress={() => router.push('/game' as any)}
          >
            <View style={styles.modeIconWrap}>
              <Ionicons name="game-controller" size={30} color="#fff" />
            </View>
            <Text style={styles.modeBtnTitle}>Partidas</Text>
            <Text style={styles.modeBtnSub}>Juega contra otros{'\n'}entrenadores</Text>
          </Pressable>

        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232, 114, 122, 0.18)', // tinte coral muy suave — mantiene la paleta sin tapar la imagen
  },

  root: {
    flex: 1,
    justifyContent: 'space-between',
  },

  titleBlock: {
    alignItems: 'center',
    paddingTop: 32,
    gap: 8,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  tradesDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    zIndex: 10,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primary,         // coral sólido — igual que todos los botones CTA
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 24,
    paddingHorizontal: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  modeBtnPressed: {
    opacity: 0.82,
  },
  modeIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.22)', // blanco suave sobre el coral
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  modeBtnTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  modeBtnSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 17,
    fontWeight: '500',
  },
});
