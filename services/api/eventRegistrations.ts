// services/api/eventRegistrations.ts

import apiClient from "./client";

export type MyEventRegistrationStatus =
  | "registered"
  | "cancelled"
  | "attended"
  | "no_show";

export interface MyEventRegistration {
  id: number;
  event_id: number;
  event_title: string;
  event_type?: string | null;
  event_date?: string | null;
  location?: string | null;
  status: MyEventRegistrationStatus;
  queue_number?: string | null;
  registered_at?: string | null;
}

function extractArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.data?.data)) return raw.data.data;
  return [];
}

function normalizeTicket(raw: any): MyEventRegistration {
  return {
    id: Number(raw.id ?? 0),
    event_id: Number(raw.event_id ?? raw.event?.id ?? 0),
    event_title: raw.event_title ?? raw.event?.title ?? "Untitled Event",
    event_type: raw.event_type ?? raw.event?.event_type ?? null,
    event_date: raw.event_date ?? raw.event?.event_date ?? raw.event?.starts_at ?? null,
    location: raw.location ?? raw.event?.location ?? null,
    status: raw.status ?? "registered",
    queue_number: raw.queue_number ?? null,
    registered_at: raw.registered_at ?? null,
  };
}

export async function fetchMyEventRegistrations(): Promise<
  MyEventRegistration[]
> {
  const res = await apiClient.get("/my-event-registrations");

  return extractArray(res.data).map(normalizeTicket);
}