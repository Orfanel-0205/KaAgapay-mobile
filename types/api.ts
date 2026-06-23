// types/api.ts
// Standard Laravel API response shapes for Ka-Agapay

// --------------------------------------------------------------------------
// Pagination
// --------------------------------------------------------------------------
export interface PaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
  path: string;
  links: Array<{ url: string | null; label: string; active: boolean }>;
}

export interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

// --------------------------------------------------------------------------
// Standard API wrapper
// --------------------------------------------------------------------------
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// --------------------------------------------------------------------------
// Laravel validation error format
// --------------------------------------------------------------------------
export interface LaravelValidationError {
  message: string;
  errors: Record<string, string[]>;
}

// --------------------------------------------------------------------------
// Generic API error
// --------------------------------------------------------------------------
export interface ApiError {
  message: string;
  code?: string | number;
  errors?: Record<string, string[]>;
}

// --------------------------------------------------------------------------
// Utility: extract flat error string from Laravel error
// --------------------------------------------------------------------------
export const flattenErrors = (error: LaravelValidationError): string =>
  Object.values(error.errors).flat().join("\n");

// --------------------------------------------------------------------------
// Dashboard
// --------------------------------------------------------------------------
export interface QueueStatus {
  ticket_number: string | null;
  position: number | null;
  estimated_wait_minutes: number | null;
  status: "waiting" | "called" | "serving" | "done" | null;
}

export interface DashboardData {
  queue: QueueStatus;
  upcoming_appointment: {
    id: number;
    doctor_name: string;
    specialty: string;
    scheduled_at: string;
  } | null;
  unread_notifications: number;
  last_consultation_summary: string | null;
}

// --------------------------------------------------------------------------
// Chat
// --------------------------------------------------------------------------
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  category?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  detected_complaint?: string;
  suggested_action?: "book_appointment" | "view_records" | null;
}

// --------------------------------------------------------------------------
// Consultation History
// --------------------------------------------------------------------------
export interface Consultation {
  id: number;
  doctor_name: string;
  specialty: string;
  date: string;
  chief_complaint: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  status: "completed" | "cancelled" | "pending";
}

// --------------------------------------------------------------------------
// Patient profile (reusable, non-clinical ITR details)
// --------------------------------------------------------------------------
export interface ResidentProfileFields {
  civil_status?: string | null;
  religion?: string | null;
  educational_attainment?: string | null;
  occupation?: string | null;
  client_type?: string | null;
  guardian_name?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  philhealth_number?: string | null;
  street?: string | null;
  purok?: string | null;
  household_number?: string | null;
  allergies?: string | null;
  past_medical_history?: string | null;
  maintenance_medications?: string | null;
  family_history?: string | null;
  personal_social_history?: string | null;
  smoking_status?: string | null;
  alcohol_intake?: string | null;
  lmp?: string | null;
  menstrual_history?: string | null;
  family_planning_method?: string | null;
  pregnancy_history?: string | null;
}

// Keys the patient is allowed to update through the profile endpoint.
export type EditableProfileKey =
  | "first_name"
  | "last_name"
  | "email"
  | "mobile_number"
  | "barangay"
  | "birthday"
  | "sex"
  | keyof ResidentProfileFields;

// Backend wraps the profile payload as { data, user } (both identical).
export interface ProfileResponse<TUser> {
  data: TUser;
  user: TUser;
  message?: string;
}

// --------------------------------------------------------------------------
// Activity Log
// --------------------------------------------------------------------------
export interface ActivityLogPayload {
  action: string;
  metadata: Record<string, unknown>;
  user_id: number | null;
  timestamp: string;
}