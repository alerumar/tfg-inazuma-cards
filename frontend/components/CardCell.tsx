
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
  
  alwaysShowQuantity?: boolean;
  width: number;
  onPress?: () => void;
  disabled?: boolean;
  removable?: boolean;
  loading?: boolean;
  
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
          
          <Image
            key={card.imageUrl}
            source={{ uri: `${BASE_URL}${card.imageUrl}` }}
            style={{ width, height: height - 4 }}
            resizeMode="contain"
          />

{!compact && (
            <View style={[styles.ratingBadge, isLegend && styles.ratingBadgeLegend]}>
              <Text style={styles.ratingText}>{card.rating}</Text>
            </View>
          )}

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

{quantity != null && (alwaysShowQuantity ? quantity >= 1 : quantity > 1) && (
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>×{quantity}</Text>
            </View>
          )}

{removable && (
            <View style={styles.removeBadge}>
              <Ionicons name="close" size={9} color="#fff" />
            </View>
          )}
        </>
      ) : (
        <Text style={[styles.cardNumber, isLegend && styles.cardNumberLegend]}>{numStr}</Text>
      )}

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

  ratingBadge: {
    position: 'absolute', top: 3, left: 3, zIndex: 2,
    backgroundColor: Colors.primary, borderRadius: 4,
    paddingHorizontal: 3, paddingVertical: 1,
  },
  ratingBadgeLegend: { backgroundColor: '#F9A825' },
  ratingText: { fontSize: 9, fontWeight: '800', color: '#fff' },

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

  quantityBadge: {
    position: 'absolute', top: 3, right: 3, zIndex: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 4,
    paddingHorizontal: 3, paddingVertical: 1,
  },
  quantityText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  removeBadge: {
    position: 'absolute', top: 3, right: 3, zIndex: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },

  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
});
