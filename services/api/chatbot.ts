// services/api/chatbot.ts
// Ka-Agapay Mobile Chatbot API
// Supports ChatGPT-style chat history.

import apiClient from "./client";
import { useAuthStore } from "../../store/useAuthStore";

export type ChatRole = "user" | "assistant";

export type MobileSuggestedAction =
  | "book_appointment"
  | "view_records"
  | "open_events"
  | "upload_id"
  | "call_emergency"
  | null;

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface TutorialCard {
  title: string;
  body: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  audience: "resident" | "staff";
  status: string;
  preview?: string | null;
  message_count?: number;
  started_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_activity_at?: string | null;
}

export interface MobileChatResponse {
  message: ChatMessage;
  session_id: string;
  audience?: "resident" | "staff";
  intent?: string;
  detected_complaint?: string | null;
  suggested_action?: MobileSuggestedAction;
  tutorial_cards?: TutorialCard[];
  meta?: Record<string, any>;
}

export interface ChatMessagesResponse {
  session: ChatSessionSummary | null;
  messages: ChatMessage[];
}

function extractArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.messages)) return payload.messages;

  return [];
}

function normalizeMessage(raw: any): ChatMessage {
  return {
    id: String(raw?.id ?? raw?.message_id ?? `msg-${Date.now()}`),
    role: raw?.role === "user" ? "user" : "assistant",
    content: String(raw?.content ?? raw?.message ?? raw?.body ?? ""),
    timestamp: String(
      raw?.timestamp ??
        raw?.created_at ??
        raw?.sent_at ??
        new Date().toISOString()
    ),
  };
}

function normalizeSession(raw: any): ChatSessionSummary {
  const sessionId =
    raw?.id ?? raw?.session_id ?? raw?.session_token ?? raw?.token ?? "";

  return {
    id: String(sessionId),
    title: String(raw?.title ?? "New chat"),
    audience: raw?.audience === "staff" ? "staff" : "resident",
    status: String(raw?.status ?? "active"),
    preview: raw?.preview ?? raw?.last_message ?? null,
    message_count: Number(raw?.message_count ?? raw?.messages_count ?? 0),
    started_at: raw?.started_at ?? raw?.created_at ?? null,
    created_at: raw?.created_at ?? null,
    updated_at: raw?.updated_at ?? null,
    last_activity_at:
      raw?.last_activity_at ?? raw?.updated_at ?? raw?.created_at ?? null,
  };
}

export async function fetchMobileChatSessions(): Promise<
  ChatSessionSummary[]
> {
  const response = await apiClient.get("/chat/history", {
    params: {
      audience: "resident",
      per_page: 50,
    },
  });

  return extractArray(response.data)
    .map(normalizeSession)
    .filter((item) => item.id.length > 0);
}

export async function fetchMobileChatMessages(
  sessionId: string
): Promise<ChatMessagesResponse> {
  const response = await apiClient.get("/chat/history", {
    params: {
      audience: "resident",
      session_id: sessionId,
    },
  });

  return {
    session: response.data?.session
      ? normalizeSession(response.data.session)
      : null,
    messages: extractArray(response.data).map(normalizeMessage),
  };
}

export async function sendMobileChatMessage(params: {
  message: string;
  sessionId?: string | null;
  history?: ChatMessage[];
  appSection?: string;
  language?: string;
}): Promise<MobileChatResponse> {
  const user = useAuthStore.getState().user;

  const response = await apiClient.post<MobileChatResponse>("/chat/message", {
    message: params.message,
    session_id: params.sessionId || undefined,
    history: params.history ?? [],
    audience: "resident",
    source: "mobile",
    context: {
      app_section: params.appSection ?? "chatbot",
      language: params.language,
      barangay_id: user?.barangay_id,
      barangay: user?.barangay,
      source: "mobile",
    },
  });

  return {
    ...response.data,
    message: normalizeMessage(response.data.message),
    session_id: String(response.data.session_id ?? ""),
  };
}

export async function endMobileChatSession(
  sessionId?: string | null
): Promise<void> {
  await apiClient.post("/chat/end", {
    audience: "resident",
    session_id: sessionId || undefined,
  });
}

export async function deleteMobileChatSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/chat/history/${encodeURIComponent(sessionId)}`, {
    params: {
      audience: "resident",
    },
  });
}