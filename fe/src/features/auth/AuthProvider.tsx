"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { User, UserRole } from "@/types";
import { authApi } from "./api/auth.api";

interface AuthResponseStatus {
  success: boolean;
  message?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthResponseStatus>;
  register: (
    username: string,
    password: string,
    role: UserRole,
  ) => Promise<AuthResponseStatus>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verifikasi token saat inisialisasi aplikasi
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("auth_token");
      const storedUser = localStorage.getItem("auth_user");

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Verifikasi token ke backend di background
          const me = await authApi.getMe();
          setUser(me);
          localStorage.setItem("auth_user", JSON.stringify(me));
        } catch {
          // Token kedaluwarsa atau invalid
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_token");
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<AuthResponseStatus> => {
      try {
        const result = await authApi.login(username, password);
        localStorage.setItem("auth_token", result.token);
        localStorage.setItem("auth_user", JSON.stringify(result.user));
        setUser(result.user);
        return { success: true };
      } catch (err: any) {
        const message =
          err.response?.data?.message ||
          err.message ||
          "Gagal terhubung ke server atau username/password salah.";
        return { success: false, message };
      }
    },
    [],
  );

  const register = useCallback(
    async (
      username: string,
      password: string,
      role: UserRole,
    ): Promise<AuthResponseStatus> => {
      try {
        const result = await authApi.register(username, password, role);
        localStorage.setItem("auth_token", result.token);
        localStorage.setItem("auth_user", JSON.stringify(result.user));
        setUser(result.user);
        return { success: true };
      } catch (err: any) {
        const message =
          err.response?.data?.message ||
          err.message ||
          "Pendaftaran akun gagal. Silakan periksa kembali data Anda.";
        return { success: false, message };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
