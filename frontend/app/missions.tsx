import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppDialog, useDialog } from '../components/AppDialog';
import { RewardItem, RewardModal } from '../components/RewardModal';
import { Colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { apiClaimMission, apiGetMissions } from '../services/missionService';
import { PersonResponse } from '../types/auth';
import { MissionType, PersonMissionData } from '../types/missions';

const TYPE_ICON: Record<MissionType, React.ComponentProps<typeof Ionicons>['name']> = {
  WIN_MATCHES:      'medal-outline',
  PLAY_MATCHES:     'game-controller-outline',
  COLLECT_CARDS:    'albums-outline',
  COLLECT_LEGENDS:  'star-outline',
  OPEN_PACKS:       'archive-outline',
  ADD_FRIENDS:      'people-outline',
  COMPLETE_TRADES:  'swap-horizontal-outline',
  REACH_LEVEL:      'trending-up-outline',
};

export default function MissionsScreen() {
  const router                              = useRouter();
  const { user, updateUser, setClaimableMissions } = useAuth();
  const { dialogCfg, showAlert } = useDialog();
  const [missions,  setMissions]  = useState<PersonMissionData[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [claiming,  setClaiming]  = useState<number | null>(null);

  const [rewardVisible, setRewardVisible] = useState(false);
  const [rewardItems,   setRewardItems]   = useState<RewardItem[]>([]);
  const [pendingUser,   setPendingUser]   = useState<PersonResponse | null>(null);

  useEffect(() => {
    if (!user) return;
    apiGetMissions(user.id)
      .then(setMissions)
      .catch(e => showAlert('Error', e.message))
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!user) return null;

  const handleClaim = async (pm: PersonMissionData) => {
    setClaiming(pm.id);
    try {
      const result = await apiClaimMission(user.id, pm.id);
      const updated = missions.map(m => m.id === pm.id ? result.mission : m);
      setMissions(updated);
      setClaimableMissions(updated.filter(m => m.completed && !m.claimed).length);

      const items: RewardItem[] = [];
      if (pm.mission.rewardExperience > 0) {
        items.push({
          icon:  'trophy-outline',
          label: 'Experiencia',
          value: `+${pm.mission.rewardExperience} XP`,
          color: '#F59E0B',
        });
      }
      if (pm.mission.rewardPoints > 0) {
        items.push({
          icon:  'hourglass-outline',
          label: 'Puntos abre-sobre',
          value: `+${pm.mission.rewardPoints}`,
          color: Colors.primary,
        });
      }

      setPendingUser(result.person);
      setRewardItems(items);
      setRewardVisible(true);
    } catch (e: unknown) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al reclamar la recompensa');
    } finally {
      setClaiming(null);
    }
  };

  const handleRewardClose = async () => {
    setRewardVisible(false);
    if (pendingUser) {
      await updateUser(pendingUser);
      setPendingUser(null);
    }
  };

  const claimable = missions.filter(m =>  m.completed && !m.claimed);
  const inProgress = missions.filter(m => !m.completed && !m.claimed);
  const claimed    = missions.filter(m =>  m.claimed);

  return (
    <SafeAreaView style={styles.root}>
      
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={Colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Misiones</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : missions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="trophy-outline" size={56} color={Colors.primaryLight} />
          <Text style={styles.emptyText}>No tienes misiones asignadas</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          
          {claimable.length > 0 && (
            <>
              <Text style={[styles.groupLabel, styles.groupLabelClaimable]}>
                🎁 Recompensas pendientes
              </Text>
              {claimable.map(pm => (
                <MissionCard
                  key={pm.id}
                  pm={pm}
                  claiming={claiming === pm.id}
                  onClaim={() => handleClaim(pm)}
                />
              ))}
            </>
          )}

{inProgress.length > 0 && (
            <>
              <Text style={[styles.groupLabel, claimable.length > 0 && { marginTop: 8 }]}>
                En progreso
              </Text>
              {inProgress.map(pm => (
                <MissionCard
                  key={pm.id}
                  pm={pm}
                  claiming={claiming === pm.id}
                  onClaim={() => handleClaim(pm)}
                />
              ))}
            </>
          )}

{claimed.length > 0 && (
            <>
              <Text style={[styles.groupLabel, { marginTop: 8 }]}>Completadas</Text>
              {claimed.map(pm => (
                <MissionCard key={pm.id} pm={pm} claiming={false} />
              ))}
            </>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>
      )}

<RewardModal
        visible={rewardVisible}
        rewards={rewardItems}
        subtitle="Misión completada"
        onClose={handleRewardClose}
      />
      <AppDialog {...dialogCfg} />
    </SafeAreaView>
  );
}

function MissionCard({
  pm, claiming, onClaim,
}: {
  pm: PersonMissionData;
  claiming: boolean;
  onClaim?: () => void;
}) {
  const { mission, progress, completed, claimed, percentage } = pm;
  const icon = TYPE_ICON[mission.type] ?? 'ribbon-outline';

  const isClaimedStyle = claimed;
  const barColor = claimed ? '#9E9E9E' : completed ? COMPLETE_COLOR : Colors.primary;

  return (
    <View style={[styles.card, isClaimedStyle && styles.cardClaimed]}>
      
      {claimed && (
        <View style={styles.claimedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#fff" />
          <Text style={styles.claimedBadgeText}>Completada</Text>
        </View>
      )}

<View style={styles.cardTop}>
        <View style={[styles.iconWrap, claimed && styles.iconWrapClaimed]}>
          <Ionicons name={icon} size={22} color={claimed ? '#9E9E9E' : Colors.primary} />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.cardTitle, claimed && styles.textFaded]}>{mission.name}</Text>
          {mission.description ? (
            <Text style={[styles.cardDesc, claimed && styles.textFaded]} numberOfLines={2}>
              {mission.description}
            </Text>
          ) : null}
        </View>
      </View>

<View style={styles.progressSection}>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={[styles.progressText, claimed && styles.textFaded]}>
          {progress} / {mission.goal}
        </Text>
      </View>

<View style={styles.rewardsRow}>
        <Text style={[styles.rewardsLabel, claimed && styles.textFaded]}>Recompensas:</Text>
        {mission.rewardExperience > 0 && (
          <RewardChip icon="trophy-outline" value={`${mission.rewardExperience} XP`} faded={claimed} />
        )}
        {mission.rewardPoints > 0 && (
          <RewardChip icon="hourglass-outline" value={String(mission.rewardPoints)} faded={claimed} />
        )}
      </View>

{completed && !claimed && (
        <Pressable
          style={[styles.claimBtn, claiming && styles.claimBtnDisabled]}
          onPress={onClaim}
          disabled={claiming}
        >
          {claiming ? (
            <ActivityIndicator size={16} color="#fff" />
          ) : (
            <>
              <Ionicons name="gift-outline" size={16} color="#fff" />
              <Text style={styles.claimBtnText}>¡Reclamar recompensa!</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

function RewardChip({
  icon, value, faded,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  faded: boolean;
}) {
  return (
    <View style={[styles.rewardChip, faded && styles.rewardChipFaded]}>
      <Ionicons name={icon} size={12} color={faded ? '#9E9E9E' : Colors.primary} />
      <Text style={[styles.rewardChipText, faded && styles.textFaded]}>{value}</Text>
    </View>
  );
}

const COMPLETE_COLOR = '#2E7D32';

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.primaryLight,
  },
  backBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },

  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textLight },

  scroll:     { padding: 16, gap: 12 },
  groupLabel: {
    fontSize: 12, fontWeight: '800', color: Colors.textLight,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2,
  },
  groupLabelClaimable: {
    color: '#2E7D32',  // verde — resalta que hay algo que recoger
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  cardClaimed: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    opacity: 0.8,
  },

  claimedBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COMPLETE_COLOR,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  claimedBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingRight: 90 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  iconWrapClaimed: { backgroundColor: '#EEEEEE' },
  cardTitleBlock:  { flex: 1, gap: 2 },
  cardTitle:       { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  cardDesc:        { fontSize: 13, color: Colors.textMid, lineHeight: 18 },

  progressSection: { gap: 4 },
  barBg: {
    height: 8, backgroundColor: Colors.primaryLight,
    borderRadius: 8, overflow: 'hidden',
  },
  barFill:      { height: '100%', borderRadius: 8 },
  progressText: { fontSize: 12, color: Colors.textLight, textAlign: 'right' },

  rewardsRow:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  rewardsLabel:  { fontSize: 12, fontWeight: '600', color: Colors.textMid },
  rewardChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryLight, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  rewardChipFaded:  { backgroundColor: '#EEEEEE' },
  rewardChipText:   { fontSize: 12, fontWeight: '600', color: Colors.textDark },

  claimBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COMPLETE_COLOR, borderRadius: 12,
    paddingVertical: 11,
  },
  claimBtnDisabled: { opacity: 0.6 },
  claimBtnText:     { fontSize: 14, fontWeight: '700', color: '#fff' },

  textFaded: { color: '#9E9E9E' },
});
