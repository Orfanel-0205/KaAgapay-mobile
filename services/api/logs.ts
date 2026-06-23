// services/api/logs.ts
import apiClient from "./client";
import { useAuthStore } from "../../store/useAuthStore";

export type LogAction =
  | "PAGE_VIEW"
  | "LOGIN"
  | "LOGOUT"
  | "USER_REGISTERED"
  | "PROFILE_UPDATED"
  | "PROFILE_VIEW"
  | "AI_CHAT_STARTED"
  | "AI_CHAT_MESSAGE_SENT"
  | "CHIEF_COMPLAINT_LOGGED"
  | "APPOINTMENT_VIEWED"
  | "APPOINTMENT_BOOKED"
  | "MEDICAL_RECORD_VIEWED"
  | "TELEMEDICINE_VIEW"
  | "TELEMEDICINE_JOINED"
  | "TELEMEDICINE_ENDED"
  | "EVENTS_VIEW"
  | "PROGRAM_REGISTERED"
  | "QUEUE_CHECKED"
  | string;

export const logActivity = async (
  action: LogAction,
  metadata: Record<string, unknown> = {}
): Promise<void> => {
  const { user, token } = useAuthStore.getState();

  // ✅ Don't even attempt the API call if there's no token
  // This prevents the 401 spam on first load before hydration
  if (!token) {
    if (__DEV__) {
      console.log(`[Ka-Agapay] Skipping logActivity (no token): ${action}`);
    }
    return;
  }

  try {
    await apiClient.post("/logs", {
      action,
      module:   metadata.module as string ?? "mobile",
      metadata: {
        ...metadata,
        barangay: user?.barangay ?? null,
      },
      // Don't send user_id — server reads it from the Bearer token
    });
  } catch {
    if (__DEV__) {
      console.warn(`[Ka-Agapay] logActivity failed silently: ${action}`);
    }
    // Never throw — logging should never break the app
  }
};