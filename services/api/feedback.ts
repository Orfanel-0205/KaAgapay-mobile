// services/api/feedback.ts
// Resident feedback API helper (PHASE 5).

import apiClient from "./client";

export type FeedbackServiceType =
  | "health_followup"
  | "onsite_consultation"
  | "online_consultation"
  | "queue_service"
  | "laboratory"
  | "prescription"
  | "general_rhu_service";

export type ConditionStatus = "improved" | "same" | "worse" | "recovered";
export type MedicationTaken = "yes" | "no" | "not_prescribed" | "not_applicable";
export type UrgencyLevel = "routine" | "watch" | "urgent";

export interface SubmitFeedbackPayload {
  service_type?: FeedbackServiceType | string;
  followup_type?: string;

  // Health follow-up (medical) fields
  condition_status?: ConditionStatus | null;
  symptoms_present?: boolean | null;
  medication_taken?: MedicationTaken | null;
  side_effects?: boolean | null;
  side_effects_description?: string | null;
  patient_message?: string | null;
  needs_follow_up?: boolean | null;
  urgency_level?: UrgencyLevel | null;

  // Legacy fields — still optional / supported by the backend.
  rating?: number | null;
  comment?: string | null;

  appointment_id?: number | null;
  consultation_id?: number | null;
  queue_ticket_id?: number | null;
}

export interface ServiceFeedback {
  id: number;
  user_id: number;
  rhu_id?: number | null;
  appointment_id?: number | null;
  consultation_id?: number | null;
  queue_ticket_id?: number | null;
  service_type: string;
  rating: number;
  comment?: string | null;
  admin_response?: string | null;
  responded_at?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
}

function extractArray(payload: any): ServiceFeedback[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

/**
 * Submit feedback after a completed service. Only sends provided fields.
 */
export async function submitFeedback(
  payload: SubmitFeedbackPayload
): Promise<ServiceFeedback> {
  const body: Record<string, any> = {
    service_type: payload.service_type ?? "health_followup",
    followup_type: payload.followup_type ?? "medical_followup",
  };

  // Health follow-up fields (only send what was answered)
  if (payload.condition_status) body.condition_status = payload.condition_status;
  if (typeof payload.symptoms_present === "boolean") {
    body.symptoms_present = payload.symptoms_present;
  }
  if (payload.medication_taken) body.medication_taken = payload.medication_taken;
  if (typeof payload.side_effects === "boolean") {
    body.side_effects = payload.side_effects;
  }
  if (
    payload.side_effects_description &&
    String(payload.side_effects_description).trim()
  ) {
    body.side_effects_description = String(payload.side_effects_description).trim();
  }
  if (payload.patient_message && String(payload.patient_message).trim()) {
    body.patient_message = String(payload.patient_message).trim();
  }
  if (typeof payload.needs_follow_up === "boolean") {
    body.needs_follow_up = payload.needs_follow_up;
  }
  if (payload.urgency_level) body.urgency_level = payload.urgency_level;

  // Legacy fields (optional)
  if (typeof payload.rating === "number") body.rating = payload.rating;
  if (payload.comment && String(payload.comment).trim()) {
    body.comment = String(payload.comment).trim();
  }

  if (payload.appointment_id) body.appointment_id = payload.appointment_id;
  if (payload.consultation_id) body.consultation_id = payload.consultation_id;
  if (payload.queue_ticket_id) body.queue_ticket_id = payload.queue_ticket_id;

  const res = await apiClient.post("/feedback", body);

  return res.data?.data ?? res.data;
}

/**
 * Fetch the resident's own submitted feedback.
 * Safe against null / empty / 404 responses.
 */
export async function fetchMyFeedback(): Promise<ServiceFeedback[]> {
  try {
    const res = await apiClient.get("/feedback");
    return extractArray(res.data);
  } catch {
    return [];
  }
}
