import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppDialog, useDialog } from '../../components/AppDialog';
import { AppHeader } from '../../components/AppHeader';
import { BASE_URL } from '../../constants/api';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import {
  apiAcceptFriendRequest,
  apiCancelFriendRequest,
  apiGetFriends,
  apiGetPendingReceived,
  apiGetPendingSent,
  apiRejectFriendRequest,
  apiRemoveFriend,
  apiSearchPersons,
  apiSendFriendRequest,
} from '../../services/friendshipService';
import { apiGetPerson } from '../../services/authService';
import { FriendshipData, PersonSearchResult, RelationshipStatus } from '../../types/friendship';
import { PersonResponse } from '../../types/auth';

type Tab = 'friends' | 'requests' | 'search';

const avatarUri = (p: PersonResponse) =>
  p.profilePhoto
    ? { uri: `${BASE_URL}${p.profilePhoto}` }
    : { uri: `${BASE_URL}/images/default_profile.png` };

// ── Pantalla ──────────────────────────────────────────────────────────────────
export default function SocialScreen() {
  const { user, showFriendRequestBadge, setPendingFriendRequests, dismissFriendRequests } = useAuth();
  const [tab, setTab] = useState<Tab>('friends');

  // Al enfocar: refresco inmediato del conteo de solicitudes.
  // Al perder foco: dismiss automático del badge (sin necesidad de interactuar).
  useFocusEffect(useCallback(() => {
    if (!user) return;
    apiGetPendingReceived(user.id)
      .then(list => setPendingFriendRequests(list.length))
      .catch(() => {});
    // cleanup: cuando el usuario navega fuera de Social, ocultar el badge
    return () => { dismissFriendRequests(); };
  }, [user?.id, setPendingFriendRequests, dismissFriendRequests]));

  if (!user) return null;

  return (
    <SafeAreaView style={styles.root}>
      <AppHeader />

      {/* Selector de pestañas */}
      <View style={styles.tabRow}>
        <TabBtn label="Amigos"      active={tab === 'friends'}  onPress={() => setTab('friends')}  />
        <TabBtn label="Solicitudes" active={tab === 'requests'} onPress={() => setTab('requests')} dot={showFriendRequestBadge} />
        <TabBtn label="Buscar"      active={tab === 'search'}   onPress={() => setTab('search')}   />
      </View>

      {tab === 'friends'  && <FriendsTab  user={user} />}
      {tab === 'requests' && <RequestsTab user={user} hasPendingRequests={showFriendRequestBadge} />}
      {tab === 'search'   && <SearchTab   user={user} />}
    </SafeAreaView>
  );
}

// ── Pestaña: Amigos (RF-14, RF-15) ───────────────────────────────────────────
function FriendsTab({ user }: { user: PersonResponse }) {
  const { dialogCfg, showAlert, showConfirm } = useDialog();
  const { updateUser } = useAuth();
  const [friends,    setFriends]    = useState<FriendshipData[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removing,   setRemoving]   = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      setFriends(await apiGetFriends(user.id));
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al cargar amigos');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [user.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRemove = (f: FriendshipData) => {
    const friend = getFriend(f, user.id);
    showConfirm(
      'Eliminar amigo',
      `¿Seguro que quieres eliminar a ${friend.nickname} de tu lista de amigos?`,
      async () => {
        setRemoving(f.id);
        try {
          await apiRemoveFriend(user.id, f.id);
          setFriends(prev => prev.filter(fr => fr.id !== f.id));
          // Refrescar user en contexto para que friendCount del perfil se actualice
          apiGetPerson(user.id).then(updateUser).catch(() => {});
        } catch (e) {
          showAlert('Error', e instanceof Error ? e.message : 'Error al eliminar amigo');
        } finally {
          setRemoving(null);
        }
      },
      { confirmLabel: 'Eliminar', destructive: true },
    );
  };

  const content = () => {
    if (loading) return <View style={styles.centerMsg}><ActivityIndicator color={Colors.primary} size="large" /></View>;
    if (friends.length === 0) return (
      <View style={styles.centerMsg}>
        <Ionicons name="people-outline" size={52} color={Colors.primaryLight} />
        <Text style={styles.centerText}>Todavía no tienes amigos</Text>
        <Text style={[styles.centerText, { fontSize: 12 }]}>¡Búscalos en la pestaña "Buscar"!</Text>
      </View>
    );
    return (
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[Colors.primary]} tintColor={Colors.primary} />}
      >
        {friends.map(f => {
          const friend = getFriend(f, user.id);
          return (
            <View key={f.id} style={styles.card}>
              <View>
                <Image source={avatarUri(friend)} style={styles.avatar} />
                {friend.online && <View style={styles.onlineDot} />}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardNick}>{friend.nickname}</Text>
                <Text style={styles.cardSub}>ID: {friend.playerId}</Text>
                <View style={styles.onlineRow}>
                  <View style={[styles.onlinePip, { backgroundColor: friend.online ? '#22C55E' : Colors.textLight }]} />
                  <Text style={[styles.onlineLabel, { color: friend.online ? '#22C55E' : Colors.textLight }]}>
                    {friend.online ? 'online' : 'offline'}
                  </Text>
                </View>
              </View>
              <View style={styles.actionBtns}>
                {removing === f.id ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Pressable style={styles.removeFriendBtn} onPress={() => handleRemove(f)}>
                    <Text style={styles.removeFriendBtnText}>Eliminar{'\n'}amigo</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <>
      {content()}
      <AppDialog {...dialogCfg} />
    </>
  );
}

/** Devuelve el amigo (el extremo de la amistad que NO es el usuario) */
const getFriend = (f: FriendshipData, userId: number) =>
  f.requester.id === userId ? f.receiver : f.requester;

// ── Pestaña: Solicitudes (recibidas + enviadas) ───────────────────────────────
function RequestsTab({ user, hasPendingRequests }: {
  user: PersonResponse;
  hasPendingRequests: boolean;
}) {
  const [subTab, setSubTab] = useState<'received' | 'sent'>('received');

  return (
    <View style={{ flex: 1 }}>
      {/* Sub-pestañas */}
      <View style={styles.subTabRow}>
        <SubTabBtn
          label="Recibidas"
          active={subTab === 'received'}
          onPress={() => setSubTab('received')}
          dot={hasPendingRequests && subTab !== 'received'}
        />
        <SubTabBtn
          label="Enviadas"
          active={subTab === 'sent'}
          onPress={() => setSubTab('sent')}
        />
      </View>

      {subTab === 'received' && <ReceivedTab user={user} />}
      {subTab === 'sent'     && <SentTab     user={user} />}
    </View>
  );
}

// ── Sub-pestaña: Solicitudes recibidas (RF-16, RF-17) ────────────────────────
function ReceivedTab({ user }: { user: PersonResponse }) {
  const { dialogCfg, showAlert } = useDialog();
  const { dismissFriendRequests, updateUser } = useAuth();
  const [requests,   setRequests]   = useState<FriendshipData[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting,     setActing]     = useState<number | null>(null);

  // El usuario está viendo esta pestaña → limpiar el badge al salir (sin necesidad de interactuar)
  useEffect(() => {
    return () => { dismissFriendRequests(); };
  }, [dismissFriendRequests]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      setRequests(await apiGetPendingReceived(user.id));
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al cargar solicitudes');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [user.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAccept = async (f: FriendshipData) => {
    setActing(f.id);
    try {
      await apiAcceptFriendRequest(user.id, f.id);
      setRequests(prev => prev.filter(r => r.id !== f.id));
      // Refrescar user en contexto para que friendCount del perfil se actualice
      apiGetPerson(user.id).then(updateUser).catch(() => {});
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al aceptar solicitud');
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (f: FriendshipData) => {
    setActing(f.id);
    try {
      await apiRejectFriendRequest(user.id, f.id);
      setRequests(prev => prev.filter(r => r.id !== f.id));
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al rechazar solicitud');
    } finally {
      setActing(null);
    }
  };

  const content = () => {
    if (loading) return <View style={styles.centerMsg}><ActivityIndicator color={Colors.primary} size="large" /></View>;
    if (requests.length === 0) return (
      <View style={styles.centerMsg}>
        <Ionicons name="mail-outline" size={52} color={Colors.primaryLight} />
        <Text style={styles.centerText}>No tienes solicitudes recibidas</Text>
      </View>
    );
    return (
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[Colors.primary]} tintColor={Colors.primary} />}
      >
        {requests.map(f => (
          <View key={f.id} style={styles.card}>
            <Image source={avatarUri(f.requester)} style={styles.avatar} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardNick}>{f.requester.nickname}</Text>
              <Text style={styles.cardSub}>ID: {f.requester.playerId} · Nv. {f.requester.level}</Text>
            </View>
            <View style={styles.actionBtns}>
              {acting === f.id ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Pressable style={styles.acceptBtn} onPress={() => handleAccept(f)}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </Pressable>
                  <Pressable style={styles.rejectBtn} onPress={() => handleReject(f)}>
                    <Ionicons name="close" size={18} color="#fff" />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <>
      {content()}
      <AppDialog {...dialogCfg} />
    </>
  );
}

// ── Sub-pestaña: Solicitudes enviadas (RF-18, RF-19) ─────────────────────────
function SentTab({ user }: { user: PersonResponse }) {
  const { dialogCfg, showAlert, showConfirm } = useDialog();
  const [sent,    setSent]    = useState<FriendshipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState<number | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      setSent(await apiGetPendingSent(user.id));
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al cargar solicitudes');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [user.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCancel = (f: FriendshipData) => {
    showConfirm(
      'Cancelar solicitud',
      `¿Seguro que quieres cancelar la solicitud a ${f.receiver.nickname}?`,
      async () => {
        setActing(f.id);
        try {
          await apiCancelFriendRequest(user.id, f.id);
          setSent(prev => prev.filter(s => s.id !== f.id));
        } catch (e) {
          showAlert('Error', e instanceof Error ? e.message : 'Error al cancelar solicitud');
        } finally {
          setActing(null);
        }
      },
      { confirmLabel: 'Cancelar solicitud', cancelLabel: 'No', destructive: true },
    );
  };

  const content = () => {
    if (loading) return <View style={styles.centerMsg}><ActivityIndicator color={Colors.primary} size="large" /></View>;
    if (sent.length === 0) return (
      <View style={styles.centerMsg}>
        <Ionicons name="paper-plane-outline" size={52} color={Colors.primaryLight} />
        <Text style={styles.centerText}>No tienes solicitudes enviadas</Text>
      </View>
    );
    return (
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[Colors.primary]} tintColor={Colors.primary} />}
      >
        {sent.map(f => (
          <View key={f.id} style={styles.card}>
            <Image source={avatarUri(f.receiver)} style={styles.avatar} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardNick}>{f.receiver.nickname}</Text>
              <Text style={styles.cardSub}>ID: {f.receiver.playerId} · Nv. {f.receiver.level}</Text>
            </View>
            <View style={styles.actionBtns}>
              {acting === f.id ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Pressable style={styles.cancelBtn} onPress={() => handleCancel(f)}>
                  <Ionicons name="close-circle-outline" size={14} color={Colors.primary} />
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <>
      {content()}
      <AppDialog {...dialogCfg} />
    </>
  );
}

// ── Pestaña: Buscar amigos ────────────────────────────────────────────────────
function SearchTab({ user }: { user: PersonResponse }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null); // playerId en proceso
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await apiSearchPersons(user.id, q.trim());
      setResults(data);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  const handleChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 400);
  };

  const { dialogCfg, showAlert } = useDialog();

  const handleSendRequest = async (result: PersonSearchResult) => {
    setSending(result.person.playerId);
    try {
      await apiSendFriendRequest(user.id, result.person.playerId);
      setResults(prev => prev.map(r =>
        r.person.playerId === result.person.playerId
          ? { ...r, relationshipStatus: 'PENDING_SENT' as RelationshipStatus }
          : r,
      ));
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Error al enviar solicitud');
    } finally {
      setSending(null);
    }
  };

  return (
    <View style={styles.searchRoot}>
      {/* Barra de búsqueda */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Busca por nombre de usuario o ID"
          placeholderTextColor={Colors.textLight}
          value={query}
          onChangeText={handleChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(''); setResults([]); }}>
            <Ionicons name="close-circle" size={18} color={Colors.textLight} />
          </Pressable>
        )}
      </View>

      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />}

      {!loading && query.length >= 2 && results.length === 0 && (
        <View style={styles.centerMsg}>
          <Ionicons name="person-outline" size={44} color={Colors.primaryLight} />
          <Text style={styles.centerText}>No se encontraron usuarios</Text>
        </View>
      )}

      {!loading && query.length < 2 && query.length > 0 && (
        <Text style={styles.hintText}>Escribe al menos 2 caracteres</Text>
      )}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {results.map(r => (
          <SearchResultCard
            key={r.person.id}
            result={r}
            sending={sending === r.person.playerId}
            onSend={() => handleSendRequest(r)}
          />
        ))}
      </ScrollView>
      <AppDialog {...dialogCfg} />
    </View>
  );
}

// ── Tarjeta de resultado de búsqueda ─────────────────────────────────────────
function SearchResultCard({
  result, sending, onSend,
}: {
  result:  PersonSearchResult;
  sending: boolean;
  onSend:  () => void;
}) {
  const { person, relationshipStatus } = result;

  const actionNode = () => {
    if (sending) return <ActivityIndicator color={Colors.primary} size="small" />;
    switch (relationshipStatus) {
      case 'ACCEPTED':
        return (
          <View style={styles.statusChip}>
            <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
            <Text style={[styles.statusChipText, { color: '#22C55E' }]}>Amigos</Text>
          </View>
        );
      case 'PENDING_SENT':
        return (
          <View style={styles.statusChip}>
            <Ionicons name="time-outline" size={14} color={Colors.textLight} />
            <Text style={styles.statusChipText}>Enviada</Text>
          </View>
        );
      case 'PENDING_RECEIVED':
        return (
          <View style={styles.statusChip}>
            <Ionicons name="mail-outline" size={14} color={Colors.primary} />
            <Text style={[styles.statusChipText, { color: Colors.primary }]}>Te ha enviado solicitud</Text>
          </View>
        );
      default:
        return (
          <Pressable style={styles.addBtn} onPress={onSend}>
            <Ionicons name="person-add-outline" size={15} color="#fff" />
            <Text style={styles.addBtnText}>Añadir</Text>
          </Pressable>
        );
    }
  };

  return (
    <View style={styles.card}>
      <Image source={avatarUri(person)} style={styles.avatar} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardNick}>{person.nickname}</Text>
        <Text style={styles.cardSub}>ID: {person.playerId} · Nv. {person.level}</Text>
      </View>
      <View style={styles.actionBtns}>
        {actionNode()}
      </View>
    </View>
  );
}

// ── Botón de sub-pestaña ─────────────────────────────────────────────────────
function SubTabBtn({ label, active, onPress, dot }: { label: string; active: boolean; onPress: () => void; dot?: boolean }) {
  return (
    <Pressable
      style={[styles.subTabBtn, active && styles.subTabBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.subTabBtnText, active && styles.subTabBtnTextActive]}>{label}</Text>
      {dot && <View style={styles.subTabDot} />}
    </Pressable>
  );
}

// ── Botón de pestaña ──────────────────────────────────────────────────────────
function TabBtn({ label, active, onPress, dot }: { label: string; active: boolean; onPress: () => void; dot?: boolean }) {
  return (
    <Pressable
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
      {dot && <View style={styles.tabDot} />}
    </Pressable>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Sub-tabs (Recibidas / Enviadas)
  subTabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    gap: 8,
  },
  subTabBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: 6, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    position: 'relative',
  },
  subTabBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  subTabBtnText:       { fontSize: 12, fontWeight: '600', color: Colors.textMid },
  subTabBtnTextActive: { color: Colors.primary },

  // Cancelar solicitud enviada
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
  },
  tabBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: Colors.border,
    position: 'relative',
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabBtnText:       { fontSize: 13, fontWeight: '700', color: Colors.textMid },
  tabBtnTextActive: { color: '#fff' },

  // Listas
  list: { padding: 16, gap: 10 },

  // Tarjeta
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2, borderColor: Colors.border,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardNick: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  cardSub:  { fontSize: 12, color: Colors.textLight },

  // Acciones
  actionBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  acceptBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
  },
  rejectBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },

  // Botón añadir
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Chip de estado
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryLight,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
  },
  statusChipText: { fontSize: 12, fontWeight: '600', color: Colors.textLight },

  // Búsqueda
  searchRoot: { flex: 1 },
  searchBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark },
  hintText: {
    textAlign: 'center', marginTop: 12,
    fontSize: 13, color: Colors.textLight,
  },

  // Online / offline
  onlineDot: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 13, height: 13,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2, borderColor: Colors.surface,
  },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlinePip: { width: 7, height: 7, borderRadius: 4 },
  onlineLabel: { fontSize: 11, fontWeight: '600' },

  // Eliminar amigo
  removeFriendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  removeFriendBtnText: {
    fontSize: 12, fontWeight: '700', color: '#fff',
    textAlign: 'center',
  },

  // Centro / vacío
  centerMsg: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  centerText: { fontSize: 14, color: Colors.textLight },

  // Dot de notificación en la pestaña de Solicitudes
  tabDot: {
    position: 'absolute',
    top: 6, right: 10,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5, borderColor: '#fff',
  },

  // Dot de notificación en la sub-pestaña Recibidas
  subTabDot: {
    position: 'absolute',
    top: 5, right: 8,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5, borderColor: '#fff',
  },
});
