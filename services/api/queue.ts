// services/api/queue.ts
// Mobile queue API helper.
// Safely returns null when the resident has no queue ticket for today
// or no resident profile yet.

import apiClient from "./client";
import type { QueueStatus } from "../../types/api";

function normalizeStatus(value: any): QueueStatus["status"] {
  const status = String(value ?? "").toLowerCase();

  if (status === "waiting") return "waiting";
  if (status === "called") return "called";
  if (status === "in_service" || status === "serving") return "serving";
  if (status === "completed" || status === "done") return "completed";

  return null;
}

function normalizeQueueTicket(raw: any): QueueStatus {
  return {
    ticket_number:
      raw?.ticket_number ??
      raw?.queue_number ??
      raw?.number ??
      null,

    position:
      raw?.queue_position !== undefined && raw?.queue_position !== null
        ? Number(raw.queue_position)
        : raw?.position !== undefined && raw?.position !== null
          ? Number(raw.position)
          : null,

    estimated_wait_minutes:
      raw?.estimated_wait_minutes !== undefined &&
      raw?.estimated_wait_minutes !== null
        ? Number(raw.estimated_wait_minutes)
        : raw?.current_wait_minutes !== undefined &&
            raw?.current_wait_minutes !== null
          ? Number(raw.current_wait_minutes)
          : raw?.wait_time_minutes !== undefined &&
              raw?.wait_time_minutes !== null
            ? Number(raw.wait_time_minutes)
            : null,

    status: normalizeStatus(raw?.status),
    rhu_id:
      raw?.rhu_id !== undefined && raw?.rhu_id !== null
        ? Number(raw.rhu_id)
        : null,
    rhu_name: raw?.rhu_name ?? raw?.rhu?.name ?? raw?.rhu?.barangay_name ?? null,
    service_type: raw?.service_type ?? raw?.service ?? null,
    service_label: raw?.service_label ?? null,
    source: raw?.source ?? null,
  };
}

export async function fetchMyQueueTicket(): Promise<QueueStatus | null> {
  try {
    const response = await apiClient.get("/queue/my-ticket");
    const payload = response.data?.data ?? response.data;

    if (!payload) {
      return null;
    }

    /*
     * Where this patient actually stands, worked out by the server at the
     * moment they asked.
     *
     * The ticket carries a queue_position, but it is written once when the
     * ticket is issued and never changes as the queue moves, so showing it
     * told people a number that quietly went stale while they waited. The
     * live count arrives alongside the ticket and wins where present.
     */
    const position = response.data?.position ?? null;

    return {
      ...normalizeQueueTicket(payload),

      ...(position
        ? {
            position: position.place_in_line ?? null,
            people_ahead: position.people_ahead ?? null,
            is_next: !!position.is_next,
            estimated_wait_minutes: position.estimated_minutes ?? null,
          }
        : {}),
    };
  } catch (error: any) {
    const status = error?.response?.status;

    if (status === 404) {
      return null;
    }

    if (__DEV__) {
      console.log("[fetchMyQueueTicket] failed:", status, error?.response?.data);
    }

    return null;
  }
}
