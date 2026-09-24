// services/chatImageStore.ts
//
// Keeping a copy of the photos a resident sends the assistant, on their phone.
//
// WHY THIS EXISTS, AND WHAT IT COMMITS TO
// ---------------------------------------
// The server never stores these images: a photo of a rash is health data about
// an identifiable person, and keeping it there would need a retention period,
// a privacy notice, a DPO entry and a deletion path. That has not changed.
//
// But it left the app showing "[larawan]" where the photo had been, so nobody
// could see what they had sent, check the right picture went, or scroll back
// to what the assistant was describing. Fixing that means the image has to
// live somewhere, and the only somewhere left is the phone.
//
// So this is a deliberate decision, not a side effect: Ka-Agapay keeps copies
// of photos residents send the assistant, in the app's own private storage.
// What that means concretely:
//
//   * The directory is inside the app sandbox. No other app can read it and it
//     does not appear in the gallery, so a photo of a rash does not turn up in
//     the camera roll or in a backup of the pictures folder.
//   * Uninstalling the app deletes it, as it deletes everything else here.
//   * Deleting a chat deletes its images, which is the behaviour anyone would
//     expect from "delete this conversation" and would be surprised to find
//     missing.
//   * A cap keeps this from growing without limit on a phone whose storage is
//     already tight. Oldest first, because the recent conversation is the one
//     being scrolled.
//
// If the RHU ever decides photos should be on the patient record instead, that
// is a different feature with paperwork attached, and this is not it.

// The legacy entry point, as services/api/prescriptions.ts already uses.
// expo-file-system 19 moved to a File/Directory API and kept the old
// path-based one here; switching both files over is a separate change.
import * as FileSystem from "expo-file-system/legacy";

const DIRECTORY = `${FileSystem.documentDirectory}chat-images/`;

/**
 * How many photos to keep across all conversations.
 *
 * Forty is roughly a fortnight of heavy use and a few tens of megabytes at the
 * 0.7 quality the picker uses. Far enough back that nobody scrolls past it,
 * small enough not to matter on a phone that is always nearly full.
 */
const MAX_IMAGES = 40;

async function ensureDirectory(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DIRECTORY);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
  }
}

/**
 * Copy a picked photo into the app's own storage and return the new path.
 *
 * The picker's uri points at a cache file the system may clear at any time, so
 * showing it after a restart would give a broken image. Returns null on
 * failure: a missing thumbnail is a blemish, not a reason to fail the message
 * the person was trying to send.
 */
export async function keepChatImage(
  sourceUri: string,
  messageId: string
): Promise<string | null> {
  try {
    await ensureDirectory();

    // The message id ties the file to the bubble that shows it, which is what
    // makes deleting a conversation able to find its images.
    const safeId = messageId.replace(/[^A-Za-z0-9_-]/g, "");
    const target = `${DIRECTORY}${safeId}.jpg`;

    await FileSystem.copyAsync({ from: sourceUri, to: target });

    void pruneOldest();

    return target;
  } catch {
    return null;
  }
}

/** Whether a kept image is still on disk, for a bubble about to render it. */
export async function chatImageExists(uri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

/** Remove the images belonging to one conversation's messages. */
export async function forgetChatImages(messageIds: string[]): Promise<void> {
  try {
    await Promise.all(
      messageIds.map((id) => {
        const safeId = id.replace(/[^A-Za-z0-9_-]/g, "");

        return FileSystem.deleteAsync(`${DIRECTORY}${safeId}.jpg`, {
          idempotent: true,
        });
      })
    );
  } catch {
    // Nothing useful to do: the conversation is going regardless, and a file
    // left behind is picked up by the cap below.
  }
}

/** Remove every kept image. Used when all chat history is cleared. */
export async function forgetAllChatImages(): Promise<void> {
  try {
    await FileSystem.deleteAsync(DIRECTORY, { idempotent: true });
  } catch {
    // As above.
  }
}

/**
 * Keep the newest MAX_IMAGES and delete the rest.
 *
 * Runs after each save rather than on a timer, so the cap is enforced at the
 * only moment the directory grows.
 */
async function pruneOldest(): Promise<void> {
  try {
    const names = await FileSystem.readDirectoryAsync(DIRECTORY);

    if (names.length <= MAX_IMAGES) return;

    const withTimes = await Promise.all(
      names.map(async (name) => {
        const info = await FileSystem.getInfoAsync(`${DIRECTORY}${name}`);

        return {
          name,
          time: info.exists && "modificationTime" in info ? info.modificationTime : 0,
        };
      })
    );

    withTimes.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));

    const doomed = withTimes.slice(0, withTimes.length - MAX_IMAGES);

    await Promise.all(
      doomed.map((entry) =>
        FileSystem.deleteAsync(`${DIRECTORY}${entry.name}`, { idempotent: true })
      )
    );
  } catch {
    // A full directory is better than a crashed send.
  }
}
