import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { api, setOnUnauthorized } from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  registerUser: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  registerUser: async () => {},
  logout: async () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function loadSession() {
      const [t, u] = await Promise.all([api.getToken(), api.getStoredUser()]);
      if (t && u) {
        try {
          setToken(t);
          setUser(JSON.parse(u));
        } catch {
          await api.removeToken();
          await api.removeStoredUser();
        }
      }
      setLoading(false);
    }
    loadSession();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && user && inAuthGroup) {
      router.replace(user.role === 'doctor' ? '/doctor-onboarding' : '/patient-onboarding');
    }
  }, [token, loading, segments, router, user]);

  const login = async (t: string, u: User) => {
    await Promise.all([api.setToken(t), api.setStoredUser(JSON.stringify(u))]);
    setToken(t);
    setUser(u);
    router.replace(u.role === 'doctor' ? '/doctor-onboarding' : '/patient-onboarding');
  };

  const registerUser = async (t: string, u: User) => {
    await Promise.all([api.setToken(t), api.setStoredUser(JSON.stringify(u))]);
    setToken(t);
    setUser(u);
    router.replace(u.role === 'doctor' ? '/doctor-onboarding' : '/patient-onboarding');
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    router.replace('/(auth)/login');
    try {
      await Promise.all([api.removeToken(), api.removeStoredUser()]);
    } catch {
      // Navigation and in-memory auth state must not depend on storage cleanup.
    }
  };

  useEffect(() => {
    setOnUnauthorized(logout);
    return () => setOnUnauthorized(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        registerUser,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
