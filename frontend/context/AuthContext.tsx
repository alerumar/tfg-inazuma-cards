import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiLogin, apiRegister } from '../services/authService';
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
  levelUpInfo: LevelUpInfo | null;
  clearLevelUp: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]               = useState<PersonResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelUpInfo | null>(null);

  // Restaurar sesión al arrancar la app
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setUser(JSON.parse(raw)); })
      .finally(() => setLoading(false));
  }, []);

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
  };

  const updateUser = async (updated: PersonResponse) => {
    // Detectar subida de nivel antes de persistir
    if (user && updated.level > user.level) {
      setLevelUpInfo({ previousLevel: user.level, newLevel: updated.level });
    }
    await persist(updated);
  };

  const clearLevelUp = () => setLevelUpInfo(null);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, levelUpInfo, clearLevelUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
