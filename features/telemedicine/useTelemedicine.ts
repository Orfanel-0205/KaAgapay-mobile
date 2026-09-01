// features/telemedicine/useTelemedicine.ts

import { useState, useCallback, useEffect, useRef } from "react";
import { Alert, Linking, AppState, AppStateStatus } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../services/api/client";
import { useAuthStore } from "../../store/useAuthStore";
import { logActivity } from "../../services/api/logs";

export interface TelemedicineSession {
  id: number;
  /**
   * The URL to actually open. It carries the JaaS JWT and is only ever taken
   * from the backend's `video.join_url`. Null when the backend did not issue a
   * usable room, in which case joining must fail loudly rather than fall back
   * to an unauthenticated public room.
   */
  join_url: string | null;
  doctor_name: string;
  doctor_specialty: string;
  scheduled_at: string;
  status: "pending" | "active" | "ended";
  duration_minutes: number;
}

interface BackendTelemedicineSession {
  id: number;
  status?: string;
  session_mode?: string;
  session_token?: string | null;
  session_link?: string | null;
  room_name?: string | null;
  // Canonical video provider config from the backend (WebRtcService). The mobile
  // app MUST open this exact room so it joins the SAME Jitsi room as RHU staff.
  video?: {
    room_url?: string | null;
    join_url?: string | null;
    url?: string | null;
    is_demo?: boolean;
    configured?: boolean;
    demo_warning?: string | null;
  } | null;
  schedule?: {
    date?: string | null;
    time?: string | null;
    estimated_duration_minutes?: number | null;
  };
  assigned_doctor?: {
    id?: number;
    name?: string;
  } | null;
}

/*
 * There is deliberately NO fallback host here.
 *
 * This used to fall back to https://meet.jit.si/<room-name>, which sent the
 * resident to a completely different service from the one RHU staff were in --
 * an unauthenticated public room with the same name, on a provider the RHU does
 * not control. A patient could sit alone in a public room believing they were
 * in a consultation. Failing to join is the safer outcome.
 */

/**
 * The only URL a client may open. `join_url` carries the JaaS JWT; `room_url` is
 * the token-free form the backend emits for display and logging, and joining
 * with it is rejected by an authenticated JaaS tenant.
 */
function resolveJoinUrl(video: BackendTelemedicineSession["video"]): string | null {
  const joinUrl = String(video?.join_url || "").trim();

  if (!joinUrl) {
    return null;
  }

  return joinUrl;
}

function mapBackendStatus(status?: string): TelemedicineSession["status"] {
  if (status === "active" || status === "paused" || status === "waiting") {
    return "active";
  }

  if (status === "ended" || status === "no_show" || status === "cancelled") {
    return "ended";
  }

  return "pending";
}

function buildScheduledAt(item: BackendTelemedicineSession): string {
  const date = item.schedule?.date;
  const time = item.schedule?.time;

  if (!date) {
    return new Date().toISOString();
  }

  const cleanTime = time ? String(time).slice(0, 5) : "00:00";

  return new Date(`${date}T${cleanTime}:00`).toISOString();
}

function normalizeSession(item: BackendTelemedicineSession): TelemedicineSession {
  /*
   * Only ever `video.join_url`.
   *
   * This previously preferred `video.room_url`, which the backend documents as
   * "token-free (safe to display/log)". Opening it against the authenticated
   * 8x8 JaaS tenant means joining with no JWT, which the tenant rejects -- the
   * same defect already found and fixed in Team Chat calling. The remaining
   * fallbacks (room_name, session_token) were bare room NAMES, not URLs, which
   * is what fed the public meet.jit.si fallback above.
   */
  return {
    id: Number(item.id),
    join_url: resolveJoinUrl(item.video),
    doctor_name: item.assigned_doctor?.name || "RHU Doctor",
    doctor_specialty: "General Medicine",
    scheduled_at: buildScheduledAt(item),
    status: mapBackendStatus(item.status),
    duration_minutes: item.schedule?.estimated_duration_minutes || 15,
  };
}

function extractArray(payload: any): BackendTelemedicineSession[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

export function useTelemedicine() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const activeSessionId = useRef<number | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const [joiningId, setJoiningId] = useState<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const wasBackground =
        appState.current === "inactive" || appState.current === "background";

      if (wasBackground && next === "active" && activeSessionId.current !== null) {
        qc.invalidateQueries({ queryKey: ["telemedicine", "sessions"] });
        activeSessionId.current = null;
      }

      appState.current = next;
    });

    return () => sub.remove();
  }, [qc]);

  const {
    data: sessions,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<TelemedicineSession[]>({
    queryKey: ["telemedicine", "sessions"],
    queryFn: async () => {
      const res = await apiClient.get("/telemedicine/sessions");
      return extractArray(res.data).map(normalizeSession);
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  const { mutate: _joinSession, isPending: isJoining } = useMutation<
    void,
    Error,
    TelemedicineSession
  >({
    mutationFn: async (session: TelemedicineSession) => {
      /*
       * Mint the token AT JOIN TIME, matching how Team Chat calling works.
       *
       * The list endpoint also issues a JWT for every session it returns, but
       * that list is polled on a timer and cached, so a token taken from it can
       * already be older than JITSI_JWT_TTL_MINUTES by the time someone taps
       * Join. Re-fetching the single session gives a token minted seconds ago,
       * and the backend authorises the caller as a participant on that same
       * request.
       */
      const fresh = await apiClient
        .get(`/telemedicine/sessions/${session.id}`)
        .then((res) => normalizeSession(res.data?.data ?? res.data))
        .catch(() => null);

      const url = fresh?.join_url ?? session.join_url;

      if (!url) {
        throw new Error(
          "Hindi pa handa ang video room para sa consultation na ito. Pakitawagan ang RHU."
        );
      }

      const canOpen = await Linking.canOpenURL(url).catch(() => false);

      if (!canOpen) {
        throw new Error(
          "Hindi ma-buksan ang browser. Siguraduhing naka-install ang Safari o Chrome."
        );
      }

      activeSessionId.current = session.id;

      await Linking.openURL(url);

      // The URL carries a signed token, so it is never logged. The session id
      // is enough to correlate this with the backend's own records.
      await logActivity("TELEMEDICINE_JOINED", {
        session_id: session.id,
        doctor_name: session.doctor_name,
      });

      qc.invalidateQueries({ queryKey: ["telemedicine", "sessions"] });
    },

    onMutate: (session) => {
      setJoiningId(session.id);
    },

    onSettled: () => {
      setJoiningId(null);
    },

    onError: (error: any) => {
      Alert.alert(
        "Hindi makakonekta",
        error?.message ||
          "Hindi ma-access ang video call. Suriin ang internet connection at subukan ulit."
      );
    },
  });

  const joinSession = useCallback(
    (sessionId: number) => {
      const session = (sessions ?? []).find((item) => item.id === sessionId);

      if (!session) {
        Alert.alert("Error", "Session not found. Refresh and try again.");
        return;
      }

      _joinSession(session);
    },
    [_joinSession, sessions]
  );

  return {
    sessions: sessions ?? [],
    isLoading,
    isRefetching,
    refetch,
    joiningId,
    isJoining,
    joinSession,
    user,
  };
}