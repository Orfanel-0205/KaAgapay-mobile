// services/api/rhus.ts
// Ka-Agapay Mobile — the RHU facilities a resident can book at.
//
// This list used to be two objects written into app/appointments/create.tsx.
// Malasiqui runs RHU 1 and RHU 2, so for a long time that was true and
// harmless. It stopped being harmless when Administration → RHU Facilities
// shipped: a super admin can now open RHU 3 from the dashboard, staff see it
// immediately, and residents could not book it until the app was rebuilt and
// pushed through the store. The admin screen promised something the app could
// not deliver.
//
// The endpoint is open to any signed-in user and is the same one the dashboard
// pickers are built from, so the two can no longer disagree.

import apiClient from "./client";

export interface MobileRhu {
  id: number;
  /** Short form for a chip or a card title, e.g. "RHU 1". */
  label: string;
  /** Full name, e.g. "RHU 1 Malasiqui". */
  name: string;
  /** Address, shown under the label when there is room. */
  sub: string;
}

/**
 * Used before the request answers, and if it fails.
 *
 * A booking screen with no facility to choose cannot be submitted at all, so
 * an out-of-date list beats an empty one: a resident on a poor connection can
 * still book at the two facilities that have always existed.
 */
export const FALLBACK_RHUS: MobileRhu[] = [
  { id: 1, label: "RHU 1", name: "RHU 1 Malasiqui", sub: "Poblacion / Main RHU" },
  { id: 2, label: "RHU 2", name: "RHU 2 Malasiqui (Don Pedro)", sub: "Secondary RHU" },
];

function normalize(raw: any): MobileRhu | null {
  const id = Number(raw?.id ?? 0);

  if (!Number.isFinite(id) || id <= 0) return null;

  const name = String(raw?.name ?? "").trim();
  const short = String(raw?.short_name ?? raw?.short ?? "").trim();

  return {
    id,
    label: short || name || `RHU ${id}`,
    name: name || short || `RHU ${id}`,
    sub: String(raw?.address ?? "").trim(),
  };
}

function extractArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;

  return [];
}

/**
 * Active facilities, in the order the dashboard lists them.
 *
 * Never throws: the caller is a booking form, and a failed lookup should cost
 * the resident an out-of-date list rather than an error screen.
 */
export async function getMobileRhus(): Promise<MobileRhu[]> {
  try {
    const response = await apiClient.get("/rhus");

    const rows = extractArray(response.data)
      .map(normalize)
      .filter((row): row is MobileRhu => row !== null);

    return rows.length > 0 ? rows : FALLBACK_RHUS;
  } catch {
    return FALLBACK_RHUS;
  }
}
