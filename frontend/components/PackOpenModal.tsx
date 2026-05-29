/**
 * PackOpenModal — revela 5 cartas de una en una con efecto de mazo apilado.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CardCell, CARD_ASPECT } from './CardCell';
import { Colors } from '../constants/colors';
import { PackCardResult, PackType } from '../types/packs';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W   = Math.min(Math.round(SCREEN_W * 0.66), 270);
const CARD_H   = Math.round(CARD_W * CARD_ASPECT);
// Espacio extra para que los fantasmas no se corten
const STACK_W  = CARD_W + 20;
const STACK_H  = CARD_H + 20;

const PACK_LABEL: Record<PackType, string> = {
  INAZUMA_ELEVEN:    'Inazuma Eleven',
  INAZUMA_ELEVEN_GO: 'Inazuma Eleven GO',
};

interface Props {
  visible:  boolean;
  cards:    PackCardResult[];
  packType: PackType | null;
  onFinish: () => void;
}

export function PackOpenModal({ visible, cards, packType, onFinish }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Reiniciar SOLO cuando la visibilidad cambia a true — no depende de cards
  // para evitar la race condition cuando se abre un segundo sobre
  useEffect(() => {
    if (visible) {
      setCurrentIdx(0);
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
    }
  }, [visible]);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible || cards.length === 0 || !packType) return null;

  const current = cards[currentIdx];
  // Guardia defensiva: si currentIdx aún no se ha reseteado, esperamos al siguiente frame
  if (!current) return null;
  const isLast     = currentIdx === cards.length - 1;
  const remaining  = cards.length - currentIdx - 1; // cartas detrás de la actual

  const handleNextCard = () => {
    if (isLast) return;
    Animated.parallel([
      Animated.timing(scaleAnim,   { toValue: 0.78, duration: 130, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0,    duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setCurrentIdx(prev => prev + 1);
      scaleAnim.setValue(1.08);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(scaleAnim,   { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.packTitle}>{PACK_LABEL[packType]}</Text>
          <Text style={styles.cardCounter}>Carta {currentIdx + 1} de {cards.length}</Text>
        </View>

        {/* Stack de cartas */}
        <View style={[styles.stackContainer, { width: STACK_W, height: STACK_H }]}>
          {/* Fantasmas (cartas por detrás) */}
          {remaining >= 3 && (
            <View style={[
              styles.ghostCard,
              { width: CARD_W, height: CARD_H, top: 16, left: 16 },
            ]} />
          )}
          {remaining >= 2 && (
            <View style={[
              styles.ghostCard,
              { width: CARD_W, height: CARD_H, top: 8, left: 8 },
            ]} />
          )}
          {remaining >= 1 && (
            <View style={[
              styles.ghostCard,
              { width: CARD_W, height: CARD_H, top: 4, left: 4 },
            ]} />
          )}

          {/* Carta actual */}
          <Animated.View style={[
            styles.mainCard,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}>
            <Pressable
              onPress={!isLast ? handleNextCard : undefined}
              style={{ position: 'relative' }}
            >
              <CardCell card={current.card} owned width={CARD_W} />
              {current.isNew && (
                <View style={styles.newBadge} pointerEvents="none">
                  <Ionicons name="sparkles" size={11} color="#fff" />
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        </View>

        {/* Progreso + hint */}
        <View style={styles.footer}>
          <View style={styles.dotsRow}>
            {cards.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < currentIdx  && styles.dotDone,
                  i === currentIdx && styles.dotCurrent,
                ]}
              />
            ))}
          </View>

          {isLast ? (
            <Text style={styles.hintLast}>¡Has visto todas las cartas!</Text>
          ) : (
            <Text style={styles.hint}>Toca la carta para ver la siguiente</Text>
          )}

          {isLast && (
            <Pressable style={styles.finishBtn} onPress={onFinish}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.finishBtnText}>Finalizar</Text>
            </Pressable>
          )}
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 30, 0.93)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },

  // Header
  header: { alignItems: 'center', gap: 4 },
  packTitle:   { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  cardCounter: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  // Stack
  stackContainer: { position: 'relative' },

  ghostCard: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },

  mainCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },

  // Badge NEW
  newBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#16A34A',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    transform: [{ rotate: '10deg' }],
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  newBadgeText: { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  // Footer
  footer: { alignItems: 'center', gap: 14, width: '100%' },

  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotDone:    { backgroundColor: 'rgba(255,255,255,0.45)' },
  dotCurrent: { backgroundColor: '#60A5FA', transform: [{ scale: 1.3 }] },

  hint:     { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  hintLast: { fontSize: 14, color: '#86EFAC',               textAlign: 'center', fontWeight: '700' },

  finishBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 16, paddingHorizontal: 36, paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  finishBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
