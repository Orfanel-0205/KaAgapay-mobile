// utils/avatarUrl.ts
// Converts whatever the backend stored (raw path OR full URL) into a
// usable absolute URL for the device to load.
//
// Backend stores one of two shapes depending on version:
//   a) Raw path:  "avatars/1/avatar.jpg"
//   b) Full URL:  "http://localhost/storage/avatars/1/avatar.jpg"
//
// In case (b) the host is wrong on physical devices, so we replace it
// with the API base host.

import apiClient from "../services/api/client";

function getStorageBase(): string {
  // apiClient.defaults.baseURL is something like:
  //   "http://192.168.1.5:8000/api/v1"
  // We want:
  //   "http://192.168.1.5:8000/storage"
  const base: string = (apiClient.defaults.baseURL as string) ?? "";
  const origin = base.replace(/\/api\/.*$/, ""); // strip /api/v1 suffix
  return `${origin}/storage`;
}

export function resolveAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;

  // Already an absolute URL with the correct host — use as-is
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    // Replace any localhost/127.0.0.1 host with the real API host
    const storageBase = getStorageBase();
    const fixed = avatar.replace(
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/,
      storageBase.replace(/\/storage$/, "")
    );
    return fixed;
  }

  // Raw storage path like "avatars/1/avatar.jpg"
  return `${getStorageBase()}/${avatar}`;
}