import api from "@/services/api";
import { User, UserRole } from "../types";

export interface AuthResponseData {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
}

export const authApi = {
  /**
   * Login ke sistem dengan username & password
   */
  async login(username: string, password: string): Promise<AuthResponseData> {
    const response = await api.post<ApiResponse<AuthResponseData>>("/auth/login", {
      username,
      password,
    });
    return response.data.data;
  },

  /**
   * Registrasi akun baru
   */
  async register(
    username: string,
    password: string,
    role: UserRole,
  ): Promise<AuthResponseData> {
    const response = await api.post<ApiResponse<AuthResponseData>>("/auth/register", {
      username,
      password,
      role,
    });
    return response.data.data;
  },

  /**
   * Mengambil data profil user saat ini via JWT
   */
  async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<User>>("/auth/me");
    return response.data.data;
  },
};
