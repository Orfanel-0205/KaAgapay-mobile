// services/api/profile.ts
// Patient profile API: load + update the reusable (non-clinical) ITR profile.
//
// The backend returns the merged user + resident_profile payload as
// { data, user } (both identical). We normalize to the User shape used by the
// auth store so the screen can merge it directly.

import apiClient from "./client";
import type { User } from "../../store/useAuthStore";
import type { EditableProfileKey, ProfileResponse } from "../../types/api";

/**
 * Fetch the current patient's profile (account fields + reusable ITR details).
 */
export async function getProfile(): Promise<User> {
  const response = await apiClient.get<ProfileResponse<User>>("/profile");
  return response.data.user ?? response.data.data;
}

/**
 * Update one or more reusable/editable profile fields.
 * Sends only the provided keys; backend validates and persists account fields
 * to `users` and reusable ITR fields to `resident_profiles`.
 */
export async function updateProfile(
  patch: Partial<Record<EditableProfileKey, string | null>>
): Promise<User> {
  const response = await apiClient.patch<ProfileResponse<User>>(
    "/profile",
    patch
  );
  return response.data.user ?? response.data.data;
}
