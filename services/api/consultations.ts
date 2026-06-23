// services/api/consultations.ts

import apiClient from "./client";

export type ConsultationStatus =
  | "open"
  | "ongoing"
  | "completed"
  | "cancelled"
  | string;

export interface ConsultationAttendant {
  user_id?: number;
  id?: number;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
}

export interface ConsultationAppointment {
  id?: number;
  user_id?: number;
  patient_id?: number;
  appointment_date?: string | null;
  appointment_time?: string | null;
  purpose?: string | null;
  reason?: string | null;
  symptoms?: string | null;
  status?: string | null;
}

export interface Consultation {
  id: number;
  user_id?: number;
  patient_id?: number;
  attended_by?: number | null;
  appointment_id?: number | null;

  date?: string | null;
  consultation_date?: string | null;

  doctor_name?: string | null;
  specialty?: string | null;

  chief_complaint?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  treatment_plan?: string | null;
  prescription?: string | null;

  status?: ConsultationStatus;

  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  notes?: string | null;

  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  attendant?: ConsultationAttendant | null;
  doctor?: ConsultationAttendant | null;
  staff?: ConsultationAttendant | null;
  provider?: ConsultationAttendant | null;

  appointment?: ConsultationAppointment | null;
}

type LaravelPaginated<T> = {
  data: T[];
  meta?: Record<string, any>;
  links?: Record<string, any>;
};

function extractArray<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.consultations)) return payload.consultations;
  return [];
}

function extractConsultation(payload: any): Consultation {
  return (
    payload?.consultation ??
    payload?.data?.consultation ??
    payload?.data ??
    payload
  );
}

function safeString(value: unknown): string {
  return String(value ?? "").trim();
}

function buildFullName(user?: ConsultationAttendant | null): string {
  if (!user) return "";

  const directName = safeString(user.full_name || user.name);

  if (directName) return directName;

  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
}

export async function fetchMyConsultations(): Promise<Consultation[]> {
  const res = await apiClient.get<LaravelPaginated<Consultation> | Consultation[]>(
    "/consultations"
  );

  return extractArray<Consultation>(res.data);
}

export async function fetchConsultation(
  id: number | string
): Promise<Consultation> {
  const res = await apiClient.get(`/consultations/${id}`);
  return extractConsultation(res.data);
}

export function getConsultationDate(
  consultation: Consultation
): string | null {
  return (
    consultation.date ||
    consultation.consultation_date ||
    consultation.completed_at ||
    consultation.started_at ||
    consultation.created_at ||
    null
  );
}

export function getConsultationDoctorName(
  consultation: Consultation
): string {
  const staff =
    consultation.attendant ||
    consultation.doctor ||
    consultation.staff ||
    consultation.provider ||
    null;

  const name = buildFullName(staff);

  return (
    safeString(consultation.doctor_name) ||
    name ||
    "RHU Staff"
  );
}

export function getConsultationTreatment(
  consultation: Consultation
): string | null {
  return (
    safeString(consultation.treatment) ||
    safeString(consultation.treatment_plan) ||
    safeString(consultation.prescription) ||
    safeString(consultation.plan) ||
    null
  );
}