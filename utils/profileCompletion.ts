// utils/profileCompletion.ts
// Mandatory-profile gating for consultation booking.
//
// The backend (GET /profile) is authoritative and returns `profile_completion`.
// This helper prefers that value and falls back to a local computation from the
// stored user object (e.g. when only the login payload is available), so the
// home banner / booking block always have something to show.

import type { User } from "../store/useAuthStore";

export interface ProfileCompletion {
  is_complete: boolean;
  can_book_consultation: boolean;
  percent: number;
  missing_fields: string[];
  missing_labels: string[];
  philhealth_present?: boolean;
  philhealth_verified?: boolean;
  philhealth_warning?: string | null;
  message: string;
}

const INCOMPLETE_MESSAGE =
  "Complete your health profile before booking a consultation. These details are required for your ITR.";
const COMPLETE_MESSAGE = "Your health profile is complete. You can book a consultation.";

function firstFilled(values: Array<unknown>): boolean {
  return values.some((v) => String(v ?? "").trim() !== "");
}

// Local fallback that mirrors the backend ProfileController::profileCompletionFor.
export function computeProfileCompletion(user: Partial<User> | null | undefined): ProfileCompletion {
  const u: any = user ?? {};

  const checks: Array<{ key: string; label: string; ok: boolean }> = [
    { key: "first_name", label: "First Name", ok: firstFilled([u.first_name]) },
    { key: "last_name", label: "Last Name", ok: firstFilled([u.last_name]) },
    {
      key: "birth_date",
      label: "Birth Date",
      ok: firstFilled([u.birthday, u.birth_date, u.birthdate, u.date_of_birth]),
    },
    { key: "gender", label: "Gender / Sex", ok: firstFilled([u.sex, u.gender]) },
    { key: "civil_status", label: "Civil Status", ok: firstFilled([u.civil_status]) },
    {
      key: "mobile_number",
      label: "Mobile Number",
      ok: firstFilled([u.mobile_number, u.contact_number, u.phone_number, u.phone]),
    },
    {
      key: "barangay",
      label: "Barangay / Address",
      ok: firstFilled([u.barangay_id, u.barangay, u.address]),
    },
    {
      key: "guardian_name",
      label: "Guardian / Emergency Contact Name",
      ok: firstFilled([u.guardian_name, u.emergency_contact_name]),
    },
    {
      key: "guardian_contact",
      label: "Guardian Contact Number",
      ok: firstFilled([u.guardian_contact, u.emergency_contact_number, u.emergency_contact]),
    },
  ];

  const missing = checks.filter((c) => !c.ok);
  const filled = checks.length - missing.length;
  const percent = checks.length > 0 ? Math.round((filled / checks.length) * 100) : 100;
  const isComplete = missing.length === 0;

  const philhealthPresent = firstFilled([u.philhealth_number, u.philhealth_no, u.philhealth_pin]);
  const philhealthVerified = Boolean(u.philhealth_verified_at);

  return {
    is_complete: isComplete,
    can_book_consultation: isComplete,
    percent,
    missing_fields: missing.map((c) => c.key),
    missing_labels: missing.map((c) => c.label),
    philhealth_present: philhealthPresent,
    philhealth_verified: philhealthVerified,
    philhealth_warning: philhealthVerified
      ? null
      : "PhilHealth is not yet verified. You may continue only if PhilHealth is not available.",
    message: isComplete ? COMPLETE_MESSAGE : INCOMPLETE_MESSAGE,
  };
}

/**
 * Resolve completion, preferring the authoritative backend value when present.
 * Accepts either a User object (with optional `profile_completion`) or the raw
 * profile response object.
 */
export function resolveProfileCompletion(source: any): ProfileCompletion {
  const backend = source?.profile_completion;

  if (backend && typeof backend === "object") {
    return {
      is_complete: Boolean(backend.is_complete),
      can_book_consultation: Boolean(backend.can_book_consultation),
      percent: Number(backend.percent ?? 0),
      missing_fields: Array.isArray(backend.missing_fields) ? backend.missing_fields : [],
      missing_labels: Array.isArray(backend.missing_labels)
        ? backend.missing_labels
        : Array.isArray(backend.missing_fields)
        ? backend.missing_fields
        : [],
      philhealth_present: backend.philhealth_present,
      philhealth_verified: backend.philhealth_verified,
      philhealth_warning: backend.philhealth_warning ?? null,
      message: backend.message ?? (backend.is_complete ? COMPLETE_MESSAGE : INCOMPLETE_MESSAGE),
    };
  }

  return computeProfileCompletion(source);
}
