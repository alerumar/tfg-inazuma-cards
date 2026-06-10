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
  
  persistUser: (updated: PersonResponse) => Promise<void>;
  
  releaseLevelUp: () => void;
  levelUpInfo: LevelUpInfo | null;
  clearLevelUp: () => void;
  
  pendingFriendRequests: number;
  setPendingFriendRequests: (n: number) => void;
  
  showFriendRequestBadge: boolean;
  
  dismissFriendRequests: () => void;
  
  unreadNotifications: number;
  
  setUnreadNotifications: (n: number) => void;
  
  claimableMissions: number;
  
  setClaimableMissions: (n: number) => void;
  
  pendingTrades: number;
  
  pendingGameInvites: number;
  
  dailyRewardAvailable: boolean;
  
  refreshBadges: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]               = useState<PersonResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelUpInfo | null>(null);
  const userRef                       = useRef<PersonResponse | null>(null);
  
  const pendingLevelUpRef             = useRef<LevelUpInfo | null>(null);

  const [pendingFriendRequests, setPendingFriendRequests_] = useState(0);
  const [friendRequestsDismissed, setFriendRequestsDismissed] = useState(false);
  
  const pendingCountRef = useRef(0);

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [claimableMissions,   setClaimableMissions]   = useState(0);
  const [pendingTrades,         setPendingTrades]         = useState(0);
  const [pendingGameInvites,    setPendingGameInvites]    = useState(0);
  const [dailyRewardAvailable,  setDailyRewardAvailable] = useState(false);

const setPendingFriendRequests = useCallback((n: number) => {
    if (n > pendingCountRef.current) {
      setFriendRequestsDismissed(false);
    }
    pendingCountRef.current = n;
    setPendingFriendRequests_(n);
  }, []);

const dismissFriendRequests = useCallback(() => setFriendRequestsDismissed(true), []);

  const showFriendRequestBadge = pendingFriendRequests > 0 && !friendRequestsDismissed;

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setUser(JSON.parse(raw)); })
      .finally(() => setLoading(false));
  }, []);

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
    }
  }, [setPendingFriendRequests]);

  const pollGameInvites = useCallback(async () => {
    if (!userRef.current) return;
    try {
      const invites = await apiGetPendingInvites(userRef.current.id);
      setPendingGameInvites(invites.length);
    } catch {  }
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

const persistUser = async (updated: PersonResponse) => {
    if (user && updated.level > user.level) {
      pendingLevelUpRef.current = { previousLevel: user.level, newLevel: updated.level };
    }
    await persist(updated);
  };

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
