/**
 * CardCell — celda de carta reutilizable.
 * Usada en: colección, selector de baraja, slots de baraja.
 */
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BASE_URL } from '../constants/api';
import { Colors } from '../constants/colors';

export const CARD_ASPECT = 1.5;

const ATQ_COLOR = '#E53935';
const CTL_COLOR = '#1565C0';
const DEF_COLOR = '#2E7D32';

/**
 * Subconjunto mínimo de campos que CardCell necesita.
 * Compatible con CardData (colección) y CardStateDto (partida).
 */
export interface CardLike {
  name: string;
  imageUrl: string | null;
  type: 'NORMAL' | 'LEGEND';
  rating: number;
  attack: number;
  control: number;
  defense: number;
}

interface CardCellProps {
  card: CardLike;
  owned?: boolean;
  cardNumber?: number;
  quantity?: number;
  /** Si true, muestra el badge de cantidad incluso cuando quantity === 1 */
  alwaysShowQuantity?: boolean;
  width: number;
  onPress?: () => void;
  disabled?: boolean;
  removable?: boolean;
  loading?: boolean;
  /** Si true, oculta el panel de nombre+stats y el badge de rating (para miniaturas) */
  compact?: boolean;
}

export function CardCell({
  card,
  owned = true,
  cardNumber,
  quantity,
  alwaysShowQuantity = false,
  width,
  onPress,
  disabled = false,
  removable = false,
  loading = false,
  compact = false,
}: CardCellProps) {
  const height   = Math.round(width * CARD_ASPECT);
  const isLegend = card.type === 'LEGEND';
  const hasImage = owned && !!card.imageUrl;
  const numStr   = cardNumber != null ? String(cardNumber).padStart(3, '0') : '?';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cell,
        { width, height },
        isLegend && styles.cellLegend,
        disabled && styles.cellDisabled,
        pressed && !disabled && onPress && styles.cellPressed,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
    >
      {hasImage ? (
        <>
          {/* Imagen — ocupa casi toda la celda */}
          <Image
            key={card.imageUrl}
            source={{ uri: `${BASE_URL}${card.imageUrl}` }}
            style={{ width, height: height - 4 }}
            resizeMode="contain"
          />

          {/* Rating badge (top-left) — oculto en modo compact */}
          {!compact && (
            <View style={[styles.ratingBadge, isLegend && styles.ratingBadgeLegend]}>
              <Text style={styles.ratingText}>{card.rating}</Text>
            </View>
          )}

          {/* Panel inferior: nombre + stats — oculto en modo compact */}
          {!compact && (
            <View style={styles.bottomPanel}>
              <Text style={styles.nameText} numberOfLines={1}>{card.name}</Text>
              <View style={styles.statsRow}>
                <StatChip value={card.attack}  bg={ATQ_COLOR} />
                <StatChip value={card.control} bg={CTL_COLOR} />
                <StatChip value={card.defense} bg={DEF_COLOR} />
              </View>
            </View>
          )}

          {/* Cantidad (top-right) */}
          {quantity != null && (alwaysShowQuantity ? quantity >= 1 : quantity > 1) && (
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>×{quantity}</Text>
            </View>
          )}

          {/* Eliminar (slots de baraja) */}
          {removable && (
            <View style={styles.removeBadge}>
              <Ionicons name="close" size={9} color="#fff" />
            </View>
          )}
        </>
      ) : (
        <Text style={[styles.cardNumber, isLegend && styles.cardNumberLegend]}>{numStr}</Text>
      )}

      {/* Spinner de carga */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size={Math.max(14, width * 0.22)} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

function StatChip({ value, bg }: { value: number; bg: string }) {
  return (
    <View style={[styles.statChip, { backgroundColor: bg }]}>
      <Text style={styles.statChipText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLegend:   { borderWidth: 1.5, borderColor: '#F9A825', backgroundColor: '#FFF8E1' },
  cellDisabled: { opacity: 0.35 },
  cellPressed:  { opacity: 0.75 },

  cardNumber:       { fontSize: 12, fontWeight: '600', color: Colors.border, letterSpacing: 1 },
  cardNumberLegend: { color: '#C8860D' },

  // Rating
  ratingBadge: {
    position: 'absolute', top: 3, left: 3, zIndex: 2,
    backgroundColor: Colors.primary, borderRadius: 4,
    paddingHorizontal: 3, paddingVertical: 1,
  },
  ratingBadgeLegend: { backgroundColor: '#F9A825' },
  ratingText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  // ── Panel inferior (nombre + stats unificados) ──────────────────────────────
  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
    backgroundColor: 'rgba(10, 10, 25, 0.68)',
    paddingHorizontal: 3,
    paddingTop: 4,
    paddingBottom: 2,
    gap: 3,
  },
  nameText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  statChip:     { flex: 1, alignItems: 'center', borderRadius: 3, paddingVertical: 1.5 },
  statChipText: { fontSize: 8, fontWeight: '700', color: '#fff' },

  // Cantidad
  quantityBadge: {
    position: 'absolute', top: 3, right: 3, zIndex: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4,
    paddingHorizontal: 3, paddingVertical: 1,
  },
  quantityText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  // Eliminar
  removeBadge: {
    position: 'absolute', top: 3, right: 3, zIndex: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },

  // Loading
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
});
