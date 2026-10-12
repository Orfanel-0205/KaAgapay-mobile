// services/chatPhoto.ts
//
// A photo for the assistant, made small before it leaves the phone.
//
// The picker hands back the camera's full picture -- 3,000 to 4,000 pixels
// across, several megabytes even at 0.7 quality. On barangay mobile data that
// is a long upload, and on the server Gemini took over 25 seconds to start on
// one, twice, so the resident waited 51 seconds and got the generic reply
// (production, 9 Oct 2026). At 1,600 pixels a rash, a wound or a medicine
// label is just as readable and the photo is a few hundred kilobytes. The
// server shrinks photos too (ChatImage), for phones on older versions.

import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export const MAX_EDGE = 1600;

/** The resize to apply, or null when the photo is already small enough. */
export function resizeFor(
  width: number,
  height: number,
  maxEdge = MAX_EDGE
): { width: number } | { height: number } | null {
  if (!width || !height || Math.max(width, height) <= maxEdge) return null;
  return width >= height ? { width: maxEdge } : { height: maxEdge };
}

export interface PreparedPhoto {
  uri: string;
  mime: string;
  name: string;
}

/**
 * Resize (if needed) and save as JPEG. Never fails the message: if the
 * phone cannot process the photo, the original goes as it was.
 */
export async function prepareChatPhoto(asset: {
  uri: string;
  width?: number;
  height?: number;
  mimeType?: string | null;
  fileName?: string | null;
}): Promise<PreparedPhoto> {
  const original: PreparedPhoto = {
    uri: asset.uri,
    mime: asset.mimeType ?? "image/jpeg",
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
  };

  try {
    const resize = resizeFor(asset.width ?? 0, asset.height ?? 0);
    const result = await manipulateAsync(asset.uri, resize ? [{ resize }] : [], {
      compress: 0.7,
      format: SaveFormat.JPEG,
    });

    return { uri: result.uri, mime: "image/jpeg", name: `photo-${Date.now()}.jpg` };
  } catch {
    return original;
  }
}
