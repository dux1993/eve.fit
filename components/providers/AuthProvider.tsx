"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { EveCharacter, ClientSessionResponse } from "@/types/auth";

interface AuthContextValue {
  isLoggedIn: boolean;
  character: EveCharacter | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isLoggedIn: false,
  character: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [character, setCharacter] = useState<EveCharacter | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        setCharacter(null);
        return;
      }
      const data = (await res.json()) as ClientSessionResponse;
      setCharacter(data.isLoggedIn ? data.character : null);
    } catch {
      setCharacter(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const login = useCallback(() => {
    window.location.href = "/api/auth/login";
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCharacter(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: character !== null,
        character,
        loading,
        login,
        logout,
        refresh: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
