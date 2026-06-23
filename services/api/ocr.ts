// services/api/ocr.ts
// PhilHealth ID OCR verification (reuses the backend /ocr/philhealth endpoint).

import apiClient from "./client";

export interface PhilHealthScanResult {
  verified: boolean;
  message: string;
  ocr_id?: number | null;
  philhealth_number?: string | null;
  philhealth_masked?: string | null;
  registered_name?: string | null;
  extracted_name?: string | null;
  name_match_score?: number | null;
  verified_at?: string | null;
}

/**
 * Upload a PhilHealth ID image and verify it against the patient profile.
 * Resolves with the result whether verified or not (422 is returned as a
 * structured failure, never thrown for the "name mismatch" / "no number" cases).
 */
export async function scanPhilHealth(uri: string): Promise<PhilHealthScanResult> {
  const formData = new FormData();
  formData.append("id_image", {
    uri,
    type: "image/jpeg",
    name: "philhealth.jpg",
  } as any);

  try {
    const res = await apiClient.post<PhilHealthScanResult>("/ocr/philhealth", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error: any) {
    // Backend returns 422 with a structured body for mismatch / unreadable.
    const data = error?.response?.data;
    if (data && typeof data === "object") {
      return {
        verified: false,
        message: data.message || "PhilHealth verification failed.",
        name_match_score: data.name_match_score ?? null,
        extracted_name: data.extracted_name ?? null,
        registered_name: data.registered_name ?? null,
        ocr_id: data.ocr_id ?? null,
      };
    }
    return {
      verified: false,
      message: error?.message || "PhilHealth verification failed.",
    };
  }
}

/** Mask a PhilHealth number for display: 12-345678901-2 -> ****-****-9012. */
export function maskPhilHealth(value?: string | null): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  const last4 = digits.slice(-4).padStart(4, "*");
  return `****-****-${last4}`;
}
