// hooks/useAuth.ts
// FIXED:
//  - Correct API routes (/login, /register, /logout — no /auth/ prefix)
//  - Logout hits server to invalidate THIS device's token only
//  - useLogout returns the mutation (caller drives navigation)

import { useMutation } from "@tanstack/react-query";
import apiClient from "../services/api/client";
import { useAuthStore, User } from "../store/useAuthStore";
import type { AxiosError } from "axios";

// ── Payload types ─────────────────────────────────────────────────────────

export interface LoginPayload {
  mobile_number: string;
  password: string;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email?: string;
  mobile_number: string;
  password: string;
  password_confirmation: string;
  barangay: string;
  birthday?: string;
  sex?: string;
}

interface AuthApiResponse {
  user: User;
  token: string;
  message?: string;
}

// ── Login ─────────────────────────────────────────────────────────────────

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation<AuthApiResponse, AxiosError, LoginPayload>({
    mutationFn: async (payload) => {
      const res = await apiClient.post<AuthApiResponse>("/login", payload);
      return res.data;
    },
    onSuccess: ({ user, token }) => {
      // ── DEBUG: confirm token shape before saving ──
      if (__DEV__) {
        console.log("[Login] user_id:", user?.user_id);
        console.log("[Login] token prefix:", token?.slice(0, 15));
        if (!token) console.error("[Login] ❌ Token is null/undefined!");
        if (!user?.user_id) console.error("[Login] ❌ user_id missing from response!");
      }
      setAuth(user, token);
    },
  });
}
// ── Register ──────────────────────────────────────────────────────────────

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation<AuthApiResponse, AxiosError, RegisterPayload>({
    mutationFn: async (payload) => {
      const res = await apiClient.post<AuthApiResponse>("/register", payload);
      return res.data;
    },
    onSuccess: ({ user, token }) => {
      setAuth(user, token);
    },
  });
}

// ── Logout — device only ──────────────────────────────────────────────────
//
// POST /api/v1/logout invalidates ONLY the token for this device (Sanctum
// uses token-based auth so each device has its own token).
// Other logged-in devices remain authenticated.

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      try {
        // Sanctum: deletes only the current token (device-specific)
        await apiClient.post("/logout");
      } catch {
        // Clear local state even if the server call fails (e.g. offline)
      }
    },
    onSettled: () => {
      logout(); // wipes AsyncStorage for this device only
    },
  });
}