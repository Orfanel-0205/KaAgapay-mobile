// services/api/announcements.ts

import apiClient from "./client";

export type AnnouncementCategory = "health_alert" | "program" | "general";

export interface MobileAnnouncement {
  id: number;
  title: string;
  body: string;
  description?: string | null;
  category: AnnouncementCategory;
  status?: string;
  published_at?: string | null;
  banner_url?: string | null;
  image_url?: string | null;
  created_at?: string | null;
}

function extractArray<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizeAnnouncement(raw: any): MobileAnnouncement {
  return {
    id: Number(raw.id),
    title: String(raw.title ?? ""),
    body: String(raw.body ?? raw.description ?? ""),
    description: raw.description ?? raw.body ?? null,
    category:
      raw.category === "health_alert" || raw.category === "program"
        ? raw.category
        : "general",
    status: raw.status ?? "published",
    published_at: raw.published_at ?? null,
    banner_url: raw.banner_url ?? raw.image_url ?? null,
    image_url: raw.image_url ?? raw.banner_url ?? null,
    created_at: raw.created_at ?? null,
  };
}

export async function fetchAnnouncements(params?: {
  per_page?: number;
  search?: string;
  category?: string;
}): Promise<MobileAnnouncement[]> {
  const res = await apiClient.get("/announcements", {
    params: {
      per_page: params?.per_page ?? 10,
      search: params?.search || undefined,
      category: params?.category || undefined,
    },
  });

  return extractArray<any>(res.data).map(normalizeAnnouncement);
}

export async function fetchAnnouncementById(id: number): Promise<MobileAnnouncement> {
  const res = await apiClient.get(`/announcements/${id}`);
  return normalizeAnnouncement(res.data?.data ?? res.data);
}
