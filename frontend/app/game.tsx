
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { BASE_URL } from '../constants/api';
import { useAuth } from '../context/AuthContext';
import { apiGetFriends } from '../services/friendshipService';
import {
  apiGetActiveMatches,
  apiGetMatchHistory,
  apiInvitePlayer,
} from '../services/matchService';
import { FriendshipData } from '../types/friendship';
import { MatchResponse, MatchStatus } from '../types/match';
import { AppDialog } from '../components/AppDialog';

function avatarUri(photo: string | null) {
  return photo ? `${BASE_URL}${photo}` : null;
}

const STATUS_LABEL: Record<MatchStatus, string> = {
  PENDING_INVITE:  'Invitación pendiente',
  WAITING_READY:   'En el lobby',
  IN_PROGRESS:     'En curso',
  FINISHED:        'Terminada',
  REJECTED:        'Rechazada',
  CANCELLED:       'Cancelada',
};

const STATUS_COLOR: Record<MatchStatus, string> = {
  PENDING_INVITE: '#F59E0B',
  WAITING_READY:  '#3B82F6',
  IN_PROGRESS:    '#22C55E',
  FINISHED:       Colors.textLight,
  REJECTED:       '#EF4444',
  CANCELLED:      Colors.textLight,
};

function matchResultLabel(m: MatchResponse, myId: number): string {
  if (m.status === 'FINISHED') {
    if (m.winnerId === null) return 'Empate';
    return m.winnerId === myId ? '¡Victoria!' : 'Derrota';
  }
  return STATUS_LABEL[m.status];
}

function matchResultColor(m: MatchResponse, myId: number): string {
  if (m.status === 'FINISHED') {
    if (m.winnerId === null) return '#F59E0B';
    return m.winnerId === myId ? '#22C55E' : '#EF4444';
  }
  return STATUS_COLOR[m.status];
}

function FriendRow({
  item,
  onInvite,
  inviting,
  userInGame,
}: {
  item: FriendshipData;
  onInvite: (friend: FriendshipData) => void;
  inviting: number | null;
  userInGame: boolean;
}) {
  const myId   = useAuth().user!.id;
  const friend = item.requester.id === myId ? item.receiver : item.requester;
  const uri    = avatarUri(friend.profilePhoto);

  const friendInMatch = friend.inActiveMatch;
  const canInvite     = friend.online && !userInGame && !friendInMatch && inviting === null;

  return (
    <View style={styles.friendRow}>
      {uri ? (
        <Image source={{ uri }} style={styles.friendAvatar} />
      ) : (
        <View style={[styles.friendAvatar, styles.friendAvatarFallback]}>
          <Ionicons name="person" size={18} color={Colors.primary} />
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendNick} numberOfLines={1}>{friend.nickname}</Text>
        <View style={styles.onlineDot}>
          <View style={[styles.dot, { backgroundColor: friend.online ? '#22C55E' : '#CCC' }]} />
          <Text style={styles.onlineText}>{friend.online ? 'Conectado' : 'Desconectado'}</Text>
        </View>
        
        {friendInMatch && (
          <View style={styles.inMatchChip}>
            <Ionicons name="game-controller" size={11} color="#F59E0B" />
            <Text style={styles.inMatchChipText}>En partida</Text>
          </View>
        )}
      </View>

      {canInvite || inviting === friend.id ? (
        <Pressable
          style={({ pressed }) => [
            styles.inviteBtn,
            inviting !== null && styles.inviteBtnDisabled,
            pressed && inviting === null && styles.inviteBtnPressed,
          ]}
          onPress={() => onInvite(item)}
          disabled={inviting !== null}
        >
          {inviting === friend.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.inviteBtnText}>Invitar</Text>
          )}
        </Pressable>
      ) : (
        <View style={[styles.inviteBtn, styles.inviteBtnDisabled]}>
          <Text style={styles.inviteBtnText}>
            {!friend.online ? 'Offline' : userInGame ? 'En partida' : '–'}
          </Text>
        </View>
      )}
    </View>
  );
}

function MatchCard({
  match,
  myId,
  onPress,
}: {
  match: MatchResponse;
  myId: number;
  onPress: () => void;
}) {
  const opponent = match.player1.id === myId ? match.player2 : match.player1;
  const uri      = avatarUri(opponent.profilePhoto);
  const label    = matchResultLabel(match, myId);
  const color    = matchResultColor(match, myId);
  const isActive = ['PENDING_INVITE', 'WAITING_READY', 'IN_PROGRESS'].includes(match.status);

  return (
    <Pressable
      style={({ pressed }) => [styles.matchCard, pressed && styles.matchCardPressed]}
      onPress={onPress}
    >
      
      {uri ? (
        <Image source={{ uri }} style={styles.matchAvatar} />
      ) : (
        <View style={[styles.matchAvatar, styles.matchAvatarFallback]}>
          <Ionicons name="person" size={20} color={Colors.primary} />
        </View>
      )}

<View style={styles.matchInfo}>
        <Text style={styles.matchNick} numberOfLines={1}>{opponent.nickname}</Text>
        <View style={[styles.statusPill, { backgroundColor: color + '22' }]}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>{label}</Text>
        </View>
      </View>

{match.status !== 'PENDING_INVITE' && (() => {
        const isFinished = match.status === 'FINISHED';
        const amP1       = match.player1.id === myId;
        const myRounds   = amP1 ? match.roundsWonPlayer1 : match.roundsWonPlayer2;
        const oppRounds  = amP1 ? match.roundsWonPlayer2 : match.roundsWonPlayer1;

        const myWon  = isFinished && match.winnerId === myId;
        const oppWon = isFinished && match.winnerId !== null && match.winnerId !== myId;
        const isDraw = isFinished && match.winnerId === null;
        const resCol = matchResultColor(match, myId);
        const myScoreColor  = myWon  ? resCol          : oppWon ? Colors.textLight : isDraw ? resCol : Colors.primary;
        const oppScoreColor = oppWon ? '#EF4444'        : myWon  ? Colors.textLight : isDraw ? resCol : Colors.textMid;

        const showTurns = isFinished && Math.max(match.roundsWonPlayer1, match.roundsWonPlayer2) < 3;
        const myTurns   = amP1 ? match.turnsWonPlayer1LastRound : match.turnsWonPlayer2LastRound;
        const oppTurns  = amP1 ? match.turnsWonPlayer2LastRound : match.turnsWonPlayer1LastRound;

        const myXp  = isFinished ? (myWon ? 200 : isDraw ? 100 : 50) : 0;
        const myPts = isFinished ? (myWon ? 6   : isDraw ? 4   : 2)  : 0;

        return (
          <View style={styles.scoreWrap}>
            
            <View style={styles.scoreRoundsRow}>
              <Text style={[styles.scoreRound, { color: myScoreColor }]}>{myRounds}</Text>
              <Text style={styles.scoreSep}>–</Text>
              <Text style={[styles.scoreRound, { color: oppScoreColor }]}>{oppRounds}</Text>
            </View>
            
            {showTurns && (
              <Text style={styles.scoreTurnsSub}>{myTurns}–{oppTurns} turnos</Text>
            )}
            
            {isFinished && (
              <Text style={styles.scoreRewards}>+{myXp} XP · +{myPts} pts</Text>
            )}
          </View>
        );
      })()}

      {isActive && (
        <Ionicons name="chevron-forward" size={18} color={Colors.textLight} style={{ marginLeft: 4 }} />
      )}
    </Pressable>
  );
}

export default function GameScreen() {
  const { user, refreshBadges } = useAuth();
  const router  = useRouter();

  const [friends,       setFriends]       = useState<FriendshipData[]>([]);
  const [activeMatches, setActiveMatches] = useState<MatchResponse[]>([]);
  const [history,       setHistory]       = useState<MatchResponse[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [inviting,      setInviting]      = useState<number | null>(null);

  const [confirmFriend, setConfirmFriend] = useState<FriendshipData | null>(null);
  const [inviteError,   setInviteError]   = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [f, a, h] = await Promise.all([
        apiGetFriends(user.id),
        apiGetActiveMatches(user.id),
        apiGetMatchHistory(user.id),
      ]);
      setFriends(f);
      setActiveMatches(a);
      setHistory(h.filter(m => m.status === 'FINISHED').slice(0, 20));
    } catch {  } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleInvite = async (item: FriendshipData) => {
    if (!user) return;
    const friend = item.requester.id === user.id ? item.receiver : item.requester;
    setConfirmFriend(item);
  };

  const confirmInvite = async () => {
    if (!user || !confirmFriend) return;
    const friend = confirmFriend.requester.id === user.id
      ? confirmFriend.receiver
      : confirmFriend.requester;
    setConfirmFriend(null);
    setInviting(friend.id);
    try {
      const match = await apiInvitePlayer(user.id, friend.id);
      refreshBadges();
      router.push(`/game/${match.id}` as any);
    } catch (e: any) {
      setInviteError(e?.message || 'No se pudo enviar la invitación');
    } finally {
      setInviting(null);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Partidas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        
        {activeMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Partidas activas</Text>
            {activeMatches.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                myId={user.id}
                onPress={() => router.push(`/game/${m.id}` as any)}
              />
            ))}
          </View>
        )}

<View style={styles.section}>
          <Text style={styles.sectionTitle}>Invitar a jugar</Text>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : friends.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={36} color={Colors.textLight} />
              <Text style={styles.emptyText}>Aún no tienes amigos.{'\n'}¡Añade algunos desde Social!</Text>
            </View>
          ) : (
            friends.map(f => (
              <FriendRow
                key={f.id}
                item={f}
                onInvite={handleInvite}
                inviting={inviting}
                userInGame={activeMatches.length > 0}
              />
            ))
          )}
        </View>

{history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historial</Text>
            {history.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                myId={user.id}
                onPress={() => router.push(`/game/${m.id}` as any)}
              />
            ))}
          </View>
        )}
      </ScrollView>

{inviteError && (
        <AppDialog
          visible
          title="No se pudo invitar"
          message={inviteError}
          confirmLabel="Entendido"
          destructive={false}
          onConfirm={() => setInviteError(null)}
          onCancel={() => setInviteError(null)}
        />
      )}

{confirmFriend && (() => {
        const friend = confirmFriend.requester.id === user.id
          ? confirmFriend.receiver
          : confirmFriend.requester;
        return (
          <AppDialog
            visible
            title="Invitar a partida"
            message={`¿Quieres retar a ${friend.nickname} a una partida?`}
            confirmLabel="¡A jugar!"
            cancelLabel="Cancelar"
            destructive={false}
            onConfirm={confirmInvite}
            onCancel={() => setConfirmFriend(null)}
          />
        );
      })()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textDark,
  },

  content: {
    padding: 16,
    gap: 8,
    paddingBottom: 32,
  },

  section: { gap: 10, marginBottom: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMid,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  friendAvatar: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: Colors.primary,
  },
  friendAvatarFallback: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  friendInfo: { flex: 1 },
  friendNick: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  onlineDot: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontSize: 11, color: Colors.textLight },
  inMatchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inMatchChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  inviteBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  inviteBtnDisabled: { backgroundColor: '#DDD' },
  inviteBtnPressed:  { opacity: 0.75 },
  inviteBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  matchCardPressed: { opacity: 0.75 },
  matchAvatar: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: Colors.primary,
  },
  matchAvatarFallback: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  matchInfo: { flex: 1, gap: 4 },
  matchNick: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  scoreWrap: { alignItems: 'flex-end', gap: 2 },
  scoreRoundsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreRound: { fontSize: 18, fontWeight: '900' },
  scoreSep: { fontSize: 14, color: Colors.textLight, fontWeight: '600' },
  scoreTurnsSub: { fontSize: 11, fontWeight: '700', color: Colors.textMid, textAlign: 'right' },
  scoreRewards:  { fontSize: 11, fontWeight: '600', color: Colors.textLight, textAlign: 'right' },

  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
});
