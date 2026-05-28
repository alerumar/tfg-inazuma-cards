/**
 * RewardModal — modal genérico de "¡Enhorabuena!" que muestra las recompensas
 * obtenidas y, al cerrarse, permite disparar el modal de subida de nivel.
 */
import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors } from '../constants/colors';

export interface RewardItem {
  icon:   React.ComponentProps<typeof Ionicons>['name'];
  label:  string;   // descripción corta, e.g. "puntos abre-sobre"
  value:  string;   // valor principal, e.g. "+6"
  color?: string;   // color del icono/valor (default Colors.primary)
}

interface Props {
  visible:   boolean;
  rewards:   RewardItem[];
  subtitle?: string;   // p.ej. "Recompensa diaria reclamada"
  onClose:   () => void;
}

export function RewardModal({ visible, rewards, subtitle, onClose }: Props) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Estrellas decorativas */}
          <View style={styles.starsRow}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Ionicons name="star" size={28} color="#F59E0B" />
            <Ionicons name="star" size={18} color="#F59E0B" />
          </View>

          {/* Título */}
          <Text style={styles.title}>¡Enhorabuena!</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {/* Separador */}
          <View style={styles.divider} />

          {/* Etiqueta "Has recibido" */}
          <Text style={styles.receivedLabel}>Has recibido</Text>

          {/* Lista de recompensas */}
          <View style={styles.rewardsList}>
            {rewards.map((r, i) => {
              const color = r.color ?? Colors.primary;
              return (
                <View key={i} style={styles.rewardRow}>
                  <View style={[styles.rewardIconWrap, { backgroundColor: color + '22' }]}>
                    <Ionicons name={r.icon} size={22} color={color} />
                  </View>
                  <Text style={[styles.rewardValue, { color }]}>{r.value}</Text>
                  <Text style={styles.rewardLabel}>{r.label}</Text>
                </View>
              );
            })}
          </View>

          {/* Botón cerrar */}
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={onClose}
          >
            <Text style={styles.btnText}>¡Genial!</Text>
          </Pressable>

        </View>
      </View>
    </Modal>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },

  card: {
    backgroundColor: Colors.background,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },

  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textDark,
    textAlign: 'center',
    marginTop: -2,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: -6,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    alignSelf: 'stretch',
  },

  receivedLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMid,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: -4,
  },

  rewardsList: {
    alignSelf: 'stretch',
    gap: 10,
  },

  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  rewardIconWrap: {
    width: 40, height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rewardValue: {
    fontSize: 22,
    fontWeight: '900',
    minWidth: 48,
  },

  rewardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMid,
    flex: 1,
  },

  btn: {
    alignSelf: 'stretch',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  btnPressed: { opacity: 0.85 },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});
