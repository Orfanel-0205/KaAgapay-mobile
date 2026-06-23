// services/api/events.ts
// Ka-Agapay Mobile Events API

import apiClient from "./client";

export type MobileEventType = "event" | "program" | "announcement";

export type EventRegistrationStatus =
  | "registered"
  | "cancelled"
  | "attended"
  | "no_show";

export interface MobileEventRegistration {
  id: number;
  status: EventRegistrationStatus;
  queue_number?: string | null;
  registered_at?: string | null;
  cancelled_at?: string | null;
}

export interface MobileEventPost {
  id: number;
  title: string;
  description: string;

  event_type: MobileEventType;

  category?: string | null;

  event_date?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;

  location?: string | null;
  target_audience?: string | null;

  tags?: string[];

  banner_url?: string | null;
  image_url?: string | null;

  sms_summary?: string | null;

  priority?: "normal" | "high" | "urgent";

  is_published: boolean;
  published_at?: string | null;

  total_registered: number;
  max_slots: number | null;
  slots_available: number | null;

  is_registered: boolean;
  registration: MobileEventRegistration | null;
}

function extractArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.data?.data)) return raw.data.data;
  return [];
}

function normalizeNumber(value: any, fallback = 0): number {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeNullableNumber(value: any): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeRegistration(raw: any): MobileEventRegistration | null {
  if (!raw) return null;

  return {
    id: normalizeNumber(raw.id),
    status: raw.status ?? "registered",
    queue_number: raw.queue_number ?? null,
    registered_at: raw.registered_at ?? null,
    cancelled_at: raw.cancelled_at ?? null,
  };
}

function normalizeEvent(raw: any): MobileEventPost {
  const registration = normalizeRegistration(raw.registration);

  return {
    id: normalizeNumber(raw.id),
    title: raw.title ?? "",
    description: raw.description ?? "",

    event_type: raw.event_type ?? raw.content_type ?? "event",

    category: raw.category ?? null,

    event_date: raw.event_date ?? raw.starts_at ?? null,
    starts_at: raw.starts_at ?? raw.event_date ?? null,
    ends_at: raw.ends_at ?? null,

    location: raw.location ?? null,
    target_audience: raw.target_audience ?? null,

    tags: Array.isArray(raw.tags)
      ? raw.tags
      : typeof raw.tags === "string"
      ? raw.tags
          .split(",")
          .map((tag: string) => tag.trim())
          .filter(Boolean)
      : [],

    banner_url: raw.banner_url ?? raw.image_url ?? null,
    image_url: raw.image_url ?? raw.banner_url ?? null,

    sms_summary: raw.sms_summary ?? null,

    priority: raw.priority ?? "normal",

    is_published: Boolean(raw.is_published),
    published_at: raw.published_at ?? null,

    total_registered: normalizeNumber(raw.total_registered, 0),
    max_slots: normalizeNullableNumber(raw.max_slots),
    slots_available: normalizeNullableNumber(raw.slots_available),

    is_registered: Boolean(raw.is_registered),
    registration,
  };
}

export async function fetchPublishedEvents(params?: {
  search?: string;
  type?: MobileEventType | "all";
  per_page?: number;
}): Promise<MobileEventPost[]> {
  const res = await apiClient.get("/programs", {
    params,
  });

  return extractArray(res.data).map(normalizeEvent);
}

export async function fetchPublishedEventById(
  id: number
): Promise<MobileEventPost> {
  const res = await apiClient.get(`/programs/${id}`);

  return normalizeEvent(res.data.data ?? res.data);
}

export async function registerForEvent(id: number): Promise<void> {
  await apiClient.post(`/programs/${id}/register`);
}

export async function cancelEventRegistration(id: number): Promise<void> {
  await apiClient.delete(`/programs/${id}/register`);
}