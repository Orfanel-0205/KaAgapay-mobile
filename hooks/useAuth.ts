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

  // Required by the backend. AuthController::register validates this as
  // ['required','accepted'] and records users.terms_accepted_at; a payload
  // without it is rejected with a 422 and no account is created. Typed as the
  // literal true so an accidental `terms_accepted: false` fails to compile
  // rather than failing at the server.
  terms_accepted: true;
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
// ── Sign-in code, after a wrong password ──────────────────────────────────
//
// When an account has had a wrong password since its last sign-in, the server
// answers the RIGHT password with HTTP 403 and code_required, and texts a
// six-digit code to the account holder's phone. Someone who knows or guesses
// the password still needs the phone.
//
// It is a 403 rather than a 200 on purpose: builds of this app from before the
// code screen existed treat any 200 from /login as a finished sign-in and
// would store an empty token. As a 403 they show the server's message instead.

export interface SignInChallenge {
  challenge: string;
  /** The last three digits of the number the code went to. */
  maskedMobile: string;
  expiresIn: number;
  resendAfter: number;
}

/** The code step hidden inside a login error, or null for a real refusal. */
export function readSignInChallenge(error: unknown): SignInChallenge | null {
  const response = (error as AxiosError<any>)?.response;
  const data = response?.data;

  if (response?.status !== 403 || !data?.code_required || !data?.challenge) {
    return null;
  }

  return {
    challenge: String(data.challenge),
    maskedMobile: String(data.masked_mobile ?? ""),
    expiresIn: Number(data.expires_in ?? 300),
    resendAfter: Number(data.resend_after ?? 60),
  };
}

export function useVerifyLoginCode() {
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation<AuthApiResponse, AxiosError, { challenge: string; code: string }>({
    mutationFn: async (payload) => {
      const res = await apiClient.post<AuthApiResponse>("/login/verify-code", payload);
      return res.data;
    },
    onSuccess: ({ user, token }) => {
      setAuth(user, token);
    },
  });
}

/** Ask for a new code. Resolves with the server's message and the next wait. */
export async function resendLoginCode(challenge: string): Promise<{ message: string; resendAfter: number }> {
  const res = await apiClient.post("/login/resend-code", { challenge });

  return {
    message: String(res.data?.message ?? "Nagpadala kami ng bagong code."),
    resendAfter: Number(res.data?.resend_after ?? 60),
  };
}

// ── Forgot password ───────────────────────────────────────────────────────
//
// The resident types their mobile number or email; a six-digit code goes to
// the account's number by SMS, and to its email if it has one. The code and a
// new password together set the password.
//
// The server gives every request the same answer and a challenge, whether or
// not an account matched, so nobody can use this screen to find out who is a
// patient of the RHU. The screen just moves on to the code step.

/** Ask for a reset code. Always resolves with a challenge. */
export async function requestPasswordReset(
  login: string
): Promise<{ challenge: string; message: string; resendAfter: number }> {
  const res = await apiClient.post("/forgot-password", { login });

  return {
    challenge: String(res.data?.challenge ?? ""),
    message: String(res.data?.message ?? "Kung may account na tugma, nagpadala kami ng code."),
    resendAfter: Number(res.data?.resend_after ?? 60),
  };
}

export async function resetPassword(payload: {
  challenge: string;
  code: string;
  password: string;
  password_confirmation: string;
}): Promise<string> {
  const res = await apiClient.post("/reset-password", payload);

  return String(res.data?.message ?? "Napalitan na ang password mo. Mag-sign in gamit ang bago.");
}

export async function resendResetCode(challenge: string): Promise<{ message: string; resendAfter: number }> {
  const res = await apiClient.post("/forgot-password/resend", { challenge });

  return {
    message: String(res.data?.message ?? "Nagpadala kami ng bagong code."),
    resendAfter: Number(res.data?.resend_after ?? 60),
  };
}

/** The most useful line from a refused request: a field error beats the summary. */
export function resetErrorMessage(error: unknown, fallback: string): string {
  const data = (error as AxiosError<any>)?.response?.data;
  const fieldErrors = Object.values((data?.errors ?? {}) as Record<string, string[]>).flat();

  return String(fieldErrors[0] ?? data?.message ?? fallback);
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