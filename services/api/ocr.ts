// services/api/ocr.ts
// PhilHealth ID OCR verification.

import apiClient from "./client";

export interface PhilHealthScanResult {
  verified: boolean;
  message: string;

  ocr_id?: number | null;

  philhealth_number?: string | null;
  philhealth_masked?: string | null;
  masked_philhealth_number?: string | null;

  registered_name?: string | null;
  extracted_name?: string | null;
  extracted_philhealth_number?: string | null;

  name_match?: boolean | null;
  name_match_score?: number | null;
  verified_at?: string | null;
}

/**
 * Upload a PhilHealth ID image and verify it against the logged-in patient profile.
 *
 * 422 responses are returned as structured failure objects instead of being thrown,
 * because mismatch / unreadable ID is an expected validation result.
 */
export async function scanPhilHealth(uri: string): Promise<PhilHealthScanResult> {
  const formData = new FormData();

  formData.append("id_image", {
    uri,
    type: "image/jpeg",
    name: "philhealth.jpg",
  } as any);

  try {
    const res = await apiClient.post<PhilHealthScanResult>(
      "/ocr/philhealth",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    const data = res.data;

    return {
      ...data,
      philhealth_masked:
        data.philhealth_masked ??
        data.masked_philhealth_number ??
        maskPhilHealth(data.philhealth_number),
      masked_philhealth_number:
        data.masked_philhealth_number ??
        data.philhealth_masked ??
        maskPhilHealth(data.philhealth_number),
    };
  } catch (error: any) {
    const data = error?.response?.data;

    if (data && typeof data === "object") {
      return {
        verified: false,
        message:
          data.message ||
          "PhilHealth ID could not be verified. Please make sure the ID belongs to the logged-in user.",

        ocr_id: data.ocr_id ?? null,

        philhealth_number: null,
        philhealth_masked: null,
        masked_philhealth_number: null,

        name_match: data.name_match ?? false,
        name_match_score: data.name_match_score ?? null,
        extracted_name: data.extracted_name ?? null,
        registered_name: data.registered_name ?? null,
        extracted_philhealth_number: data.extracted_philhealth_number ?? null,
      };
    }

    return {
      verified: false,
      message:
        error?.message ||
        "PhilHealth verification failed. Please try again with a clearer photo.",
    };
  }
}

/**
 * Mask a PhilHealth number for display.
 *
 * Example:
 * 12-345678901-2 -> ****-****-9012
 */
export function maskPhilHealth(value?: string | null): string {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  const last4 = digits.slice(-4).padStart(4, "*");

  return `****-****-${last4}`;
}