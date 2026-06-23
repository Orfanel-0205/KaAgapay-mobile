// store/useAuthStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  mobile_number: string;
  account_status?: string;
  role?: string;

  // Important:
  // barangay_id is used by chatbot context and heatmap mapping.
  barangay_id?: number | null;
  barangay?: string | null;

  avatar?: string | null;
  profile_picture?: string | null;
  biometric_enabled?: boolean;
  id_verified?: boolean;
  birthday?: string | null;
  sex?: string | null;

  // Reusable patient ITR details (from resident_profiles).
  // Non-clinical, patient-editable, re-used across appointments/queue/consultations.
  civil_status?: string | null;
  religion?: string | null;
  educational_attainment?: string | null;
  occupation?: string | null;
  client_type?: string | null;
  guardian_name?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  philhealth_number?: string | null;
  street?: string | null;
  purok?: string | null;
  household_number?: string | null;
  allergies?: string | null;
  past_medical_history?: string | null;
  maintenance_medications?: string | null;
  family_history?: string | null;
  personal_social_history?: string | null;
  smoking_status?: string | null;
  alcohol_intake?: string | null;
  lmp?: string | null;
  menstrual_history?: string | null;
  family_planning_method?: string | null;
  pregnancy_history?: string | null;

  // Mandatory-profile gating (computed by the backend on GET /profile).
  philhealth_verified_at?: string | null;
  profile_completion?: {
    is_complete: boolean;
    can_book_consultation: boolean;
    percent: number;
    missing_fields: string[];
    missing_labels?: string[];
    philhealth_present?: boolean;
    philhealth_verified?: boolean;
    philhealth_warning?: string | null;
    message?: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  isAuthenticated: boolean;

  setAuth: (user: User, token: string) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: false,
      isAuthenticated: false,

      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "ka-agapay-auth",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("[AuthStore] Rehydration failed:", error);
        }

        state?.setHydrated();
      },
    }
  )
);

let _hydrationTimer: ReturnType<typeof setTimeout> | null = null;

export function ensureHydration(): Promise<void> {
  return new Promise((resolve) => {
    if (useAuthStore.getState().hydrated) {
      resolve();
      return;
    }

    const unsub = useAuthStore.subscribe((state) => {
      if (state.hydrated) {
        unsub();

        if (_hydrationTimer) {
          clearTimeout(_hydrationTimer);
        }

        resolve();
      }
    });

    _hydrationTimer = setTimeout(() => {
      unsub();
      console.warn("[AuthStore] Hydration timeout — forcing ready state");
      useAuthStore.getState().setHydrated();
      resolve();
    }, 3000);
  });
}