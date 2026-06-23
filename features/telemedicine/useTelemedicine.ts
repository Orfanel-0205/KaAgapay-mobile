// features/telemedicine/useTelemedicine.ts

import { useState, useCallback, useEffect, useRef } from "react";
import { Alert, Linking, AppState, AppStateStatus } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../services/api/client";
import { useAuthStore } from "../../store/useAuthStore";
import { logActivity } from "../../services/api/logs";

export interface TelemedicineSession {
  id: number;
  room_id: string;
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

const JITSI_HOST = "https://meet.jit.si";

function buildJitsiUrl(roomId: string): string {
  if (roomId.startsWith("http")) {
    return roomId;
  }

  const safeRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, "");

  return `${JITSI_HOST}/${safeRoom}`;
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
  return {
    id: Number(item.id),
    room_id:
      item.session_link ||
      item.session_token ||
      `kaagapay-session-${item.id}`,
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
      const url = buildJitsiUrl(session.room_id);

      const canOpen = await Linking.canOpenURL(url).catch(() => false);

      if (!canOpen) {
        throw new Error(
          "Hindi ma-buksan ang browser. Siguraduhing naka-install ang Safari o Chrome."
        );
      }

      activeSessionId.current = session.id;

      await Linking.openURL(url);

      await logActivity("TELEMEDICINE_JOINED", {
        session_id: session.id,
        room_id: session.room_id,
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