import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { apiHeartbeat, apiLogin, apiRegister } from '../services/authService';
import { apiGetPendingReceived } from '../services/friendshipService';
import { apiGetMissions } from '../services/missionService';
import { apiGetUnreadCount } from '../services/notificationService';
import { apiGetActiveTrades } from '../services/tradeService';
import { apiGetPendingInvites } from '../services/matchService';
import { apiGetPackStatus } from '../services/packService';
import { LoginRequest, PersonResponse, RegisterRequest } from '../types/auth';

const STORAGE_KEY = 'inazuma_user';

export interface LevelUpInfo {
  previousLevel: number;
  newLevel: number;
}

interface AuthContextValue {
  user: PersonResponse | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: PersonResponse) => Promise<void>;
  /**
   * Igual que updateUser pero NO muestra el modal de subida de nivel de inmediato.
   * El modal queda en espera hasta que se llame a releaseLevelUp().
   * Úsalo en pantallas donde no quieres interrumpir la experiencia (p.ej. pantalla de partida).
   */
  persistUser: (updated: PersonResponse) => Promise<void>;
  /** Muestra el modal de subida de nivel si quedó pendiente tras un persistUser. */
  releaseLevelUp: () => void;
  levelUpInfo: LevelUpInfo | null;
  clearLevelUp: () => void;
  /**
   * Número real de solicitudes de amistad recibidas pendientes.
   * Actualizado por el polling y por useFocusEffect de SocialScreen.
   */
  pendingFriendRequests: number;
  setPendingFriendRequests: (n: number) => void;
  /**
   * true cuando hay solicitudes Y el usuario no las ha "visto" desde la última
   * que llegó. Se usa para mostrar el badge en el nav y en las pestañas.
   */
  showFriendRequestBadge: boolean;
  /** Llamar cuando el usuario ha visto la pestaña de recibidas (limpia el badge). */
  dismissFriendRequests: () => void;
  /** Número de notificaciones no leídas. */
  unreadNotifications: number;
  /** Llamar desde la pantalla de notificaciones tras marcar todas como leídas. */
  setUnreadNotifications: (n: number) => void;
  /** Número de misiones completadas pero sin reclamar. */
  claimableMissions: number;
  /** Llamar desde missions.tsx tras reclamar para actualizar el badge al instante. */
  setClaimableMissions: (n: number) => void;
  /** Intercambios activos donde el usuario tiene que actuar (recibir o confirmar). */
  pendingTrades: number;
  /** Invitaciones a partida pendientes donde el usuario es el receptor. */
  pendingGameInvites: number;
  /** true cuando el usuario aún no ha reclamado el regalo diario. */
  dailyRewardAvailable: boolean;
  /**
   * Lanza un poll inmediato de todos los badges (solicitudes, notificaciones,
   * misiones e intercambios). Llámalo tras cualquier acción que cambie estos
   * contadores para que el punto rojo se actualice al instante sin esperar los 20 s.
   */
  refreshBadges: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]               = useState<PersonResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelUpInfo | null>(null);
  const userRef                       = useRef<PersonResponse | null>(null);
  /** Subida de nivel guardada pero no mostrada todavía (usada por persistUser). */
  const pendingLevelUpRef             = useRef<LevelUpInfo | null>(null);

  // ── Badge de solicitudes de amistad ─────────────────────────────────────────
  const [pendingFriendRequests, setPendingFriendRequests_] = useState(0);
  const [friendRequestsDismissed, setFriendRequestsDismissed] = useState(false);
  /** Ref para detectar si el conteo ha SUBIDO (= nueva solicitud). */
  const pendingCountRef = useRef(0);

  // ── Notificaciones, misiones e intercambios (badges globales) ───────────────
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [claimableMissions,   setClaimableMissions]   = useState(0);
  const [pendingTrades,         setPendingTrades]         = useState(0);
  const [pendingGameInvites,    setPendingGameInvites]    = useState(0);
  const [dailyRewardAvailable,  setDailyRewardAvailable] = useState(false);

  /**
   * Actualiza el conteo de solicitudes pendientes.
   * Si el número sube, resetea el dismiss para que el badge vuelva a aparecer.
   */
  const setPendingFriendRequests = useCallback((n: number) => {
    if (n > pendingCountRef.current) {
      setFriendRequestsDismissed(false);
    }
    pendingCountRef.current = n;
    setPendingFriendRequests_(n);
  }, []);

  /** El usuario ha visto las solicitudes → ocultar el badge hasta la próxima nueva. */
  const dismissFriendRequests = useCallback(() => setFriendRequestsDismissed(true), []);

  const showFriendRequestBadge = pendingFriendRequests > 0 && !friendRequestsDismissed;

  // Sincronizar ref para acceder al user actual desde callbacks sin re-crear intervalos
  useEffect(() => { userRef.current = user; }, [user]);

  // Restaurar sesión al arrancar la app
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setUser(JSON.parse(raw)); })
      .finally(() => setLoading(false));
  }, []);

  // ── Heartbeat: avisa al servidor cada 30 s para mantener el estado online ──
  useEffect(() => {
    const tick = () => { if (userRef.current) apiHeartbeat(userRef.current.id); };

    tick(); // Ping inmediato al montar
    const interval = setInterval(tick, 30_000);

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') tick();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  // ── Polling cada 20 s: solicitudes + notificaciones + misiones + intercambios ─
  const poll = useCallback(async () => {
    if (!userRef.current) return;
    try {
      const [friendList, unread, missions, activeTrades, packStatus] = await Promise.all([
        apiGetPendingReceived(userRef.current.id),
        apiGetUnreadCount(userRef.current.id),
        apiGetMissions(userRef.current.id),
        apiGetActiveTrades(userRef.current.id),
        apiGetPackStatus(userRef.current.id),
      ]);
      setPendingFriendRequests(friendList.length);
      setUnreadNotifications(unread);
      setClaimableMissions(missions.filter(m => m.completed && !m.claimed).length);
      const uid = userRef.current.id;
      setPendingTrades(activeTrades.filter(t =>
        (t.receiver.id === uid && t.status === 'PENDING_RESPONSE') ||
        (t.initiator.id === uid && t.status === 'PENDING_CONFIRMATION')
      ).length);
      setDailyRewardAvailable(packStatus.dailyRewardAvailable);
    } catch {
      // Silent fail — no bloquear la app si el servidor no responde
    }
  }, [setPendingFriendRequests]);

  // ── Poll rápido cada 3 s: solo invitaciones de partida ────────────────────────
  // Las invitaciones deben llegar al receptor en < 3 s; el resto de badges
  // no necesita esa frecuencia y se mantiene en el ciclo de 20 s.
  const pollGameInvites = useCallback(async () => {
    if (!userRef.current) return;
    try {
      const invites = await apiGetPendingInvites(userRef.current.id);
      setPendingGameInvites(invites.length);
    } catch { /* silent */ }
  }, []);

  const refreshBadges = useCallback(() => { poll(); pollGameInvites(); }, [poll, pollGameInvites]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 5_000);
    return () => clearInterval(interval);
  }, [poll]);

  useEffect(() => {
    pollGameInvites();
    const interval = setInterval(pollGameInvites, 3_000);
    return () => clearInterval(interval);
  }, [pollGameInvites]);

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const persist = async (p: PersonResponse) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    setUser(p);
  };

  const login = async (data: LoginRequest) => {
    const person = await apiLogin(data);
    await persist(person);
  };

  const register = async (data: RegisterRequest) => {
    const person = await apiRegister(data);
    await persist(person);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
    // Resetear todos los badges al cerrar sesión
    pendingCountRef.current = 0;
    setPendingFriendRequests_(0);
    setFriendRequestsDismissed(false);
    setUnreadNotifications(0);
    setClaimableMissions(0);
    setPendingTrades(0);
    setPendingGameInvites(0);
    setDailyRewardAvailable(false);
  };

  const updateUser = async (updated: PersonResponse) => {
    if (user && updated.level > user.level) {
      setLevelUpInfo({ previousLevel: user.level, newLevel: updated.level });
    }
    await persist(updated);
  };

  /**
   * Persiste los datos del usuario sin mostrar el modal de subida de nivel.
   * Si hay subida de nivel, la guarda en pendingLevelUpRef para mostrarla
   * cuando se llame a releaseLevelUp().
   */
  const persistUser = async (updated: PersonResponse) => {
    if (user && updated.level > user.level) {
      pendingLevelUpRef.current = { previousLevel: user.level, newLevel: updated.level };
    }
    await persist(updated);
  };

  /** Muestra el modal de subida de nivel si quedó en espera tras un persistUser(). */
  const releaseLevelUp = useCallback(() => {
    if (pendingLevelUpRef.current) {
      setLevelUpInfo(pendingLevelUpRef.current);
      pendingLevelUpRef.current = null;
    }
  }, []);

  const clearLevelUp = () => {
    setLevelUpInfo(null);
    pendingLevelUpRef.current = null; // limpiar también cualquier pendiente
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, updateUser,
      persistUser, releaseLevelUp,
      levelUpInfo, clearLevelUp,
      pendingFriendRequests, setPendingFriendRequests,
      showFriendRequestBadge, dismissFriendRequests,
      unreadNotifications, setUnreadNotifications,
      claimableMissions, setClaimableMissions,
      pendingTrades, pendingGameInvites, dailyRewardAvailable, refreshBadges,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
