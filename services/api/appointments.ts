// services/api/appointments.ts

import apiClient from "./client";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "approved"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rejected";

export type ConsultationType = "online" | "onsite";

export interface AppointmentResident {
  user_id?: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  mobile_number?: string;
}

export interface AppointmentHandler {
  user_id?: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
}

export interface AppointmentConsultation {
  id: number;
  status?: string | null;
  consultation_date?: string | null;
  created_at?: string | null;
}

export interface Appointment {
  id: number;
  user_id: number;
  handled_by?: number | null;

  appointment_date: string;
  appointment_time?: string | null;

  purpose?: string | null;
  status: AppointmentStatus;
  notes?: string | null;

  consultation_type?: ConsultationType;
  reason?: string | null;
  symptoms?: string | null;
  rejection_reason?: string | null;

  approved_at?: string | null;
  scheduled_at?: string | null;

  consultation?: AppointmentConsultation | null;

  created_at?: string;
  updated_at?: string;

  resident?: AppointmentResident | null;
  handler?: AppointmentHandler | null;

  queue_ticket?: any | null;
  telemedicine_request?: any | null;
}

export interface CreateAppointmentPayload {
  consultation_type: ConsultationType;
  reason: string;
  symptoms?: string;
  preferred_date: string;
  preferred_time?: string;
  rhu_id?: number;
  urgency_level?: "routine" | "urgent" | "emergency";
}

type LaravelPaginated<T> = {
  data: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
};

function extractArray<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function extractAppointment(payload: any): Appointment {
  return payload?.appointment ?? payload?.data ?? payload;
}

function normalizeTime(value?: string): string | undefined {
  if (!value) return undefined;

  const raw = String(value).trim();

  if (!raw) return undefined;

  // Accepts 09:00 or 09:00:00 and sends only 09:00
  const timeMatch = raw.match(/^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/);

  if (timeMatch) {
    const hour = String(Number(timeMatch[1])).padStart(2, "0");
    const minute = timeMatch[2];

    return `${hour}:${minute}`;
  }

  // Accepts 9:00 AM / 9:00 PM
  const amPmMatch = raw.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);

  if (amPmMatch) {
    let hour = Number(amPmMatch[1]);
    const minute = amPmMatch[2];
    const period = amPmMatch[3].toUpperCase();

    if (period === "PM" && hour < 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    return `${String(hour).padStart(2, "0")}:${minute}`;
  }

  // Last fallback: only send first 5 chars if it looks like HH:mm
  if (raw.length >= 5 && /^\d{1,2}:\d{2}/.test(raw)) {
    const [hour, minute] = raw.slice(0, 5).split(":");
    return `${String(Number(hour)).padStart(2, "0")}:${minute}`;
  }

  return undefined;
}

export async function fetchMyAppointments(): Promise<Appointment[]> {
  try {
    const res = await apiClient.get<LaravelPaginated<Appointment> | Appointment[]>(
      "/appointments/my"
    );

    return extractArray<Appointment>(res.data);
  } catch {
    const res = await apiClient.get<LaravelPaginated<Appointment> | Appointment[]>(
      "/appointments"
    );

    return extractArray<Appointment>(res.data);
  }
}

export async function fetchAppointment(
  id: number | string
): Promise<Appointment> {
  try {
    const res = await apiClient.get(`/appointments/show/${id}`);
    return extractAppointment(res.data);
  } catch {
    const res = await apiClient.get(`/appointments/detail/${id}`);
    return extractAppointment(res.data);
  }
}

export async function createAppointment(
  payload: CreateAppointmentPayload
): Promise<Appointment> {
  const reason = payload.reason.trim();
  const symptoms = payload.symptoms?.trim() || "";
  const normalizedTime = normalizeTime(payload.preferred_time);

  const purpose = [
    `[${payload.consultation_type.toUpperCase()} CONSULTATION]`,
    `Reason: ${reason}`,
    symptoms ? `Symptoms: ${symptoms}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const body: Record<string, any> = {
    consultation_type: payload.consultation_type,
    reason,
    symptoms: symptoms || null,

    preferred_date: payload.preferred_date,
    appointment_date: payload.preferred_date,

    purpose,
    urgency_level: payload.urgency_level || "routine",
  };

  if (normalizedTime) {
    body.preferred_time = normalizedTime;
    body.appointment_time = normalizedTime;
  }

  if (payload.rhu_id) {
    body.rhu_id = payload.rhu_id;
  }

  const res = await apiClient.post("/appointments", body);

  return extractAppointment(res.data);
}

export async function cancelAppointment(
  id: number | string
): Promise<Appointment> {
  const res = await apiClient.patch(`/appointments/${id}/status`, {
    status: "cancelled",
    notes: "Cancelled by patient.",
  });

  return extractAppointment(res.data);
}

export function getAppointmentDisplayType(
  appointment: Appointment
): ConsultationType {
  if (appointment.consultation_type === "online") return "online";
  return "onsite";
}

export function getAppointmentReason(appointment: Appointment): string {
  if (appointment.reason) return appointment.reason;

  const purpose = appointment.purpose || "";
  const match = purpose.match(/Reason:\s*(.+)/i);

  return match?.[1]?.trim() || purpose || "Consultation";
}

export function getAppointmentSymptoms(appointment: Appointment): string {
  if (appointment.symptoms) return appointment.symptoms;

  const purpose = appointment.purpose || "";
  const match = purpose.match(/Symptoms:\s*(.+)/i);

  return match?.[1]?.trim() || "";
}