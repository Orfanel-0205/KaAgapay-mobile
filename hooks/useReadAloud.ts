// hooks/useReadAloud.ts
//
// Reading the assistant's replies out loud.
//
// The assistant exists partly for residents who find typing hard -- older
// patients, anyone with poor eyesight, anyone reading slowly. Answering them
// with six paragraphs of Tagalog puts the same barrier back, just facing the
// other way. A speaker button on each reply removes it.
//
// Only one reply speaks at a time. Two voices over each other is unusable, and
// on Android a second speak() call queues rather than replaces by default, so
// tapping a few bubbles would read all of them in turn with no obvious way to
// stop.

import { useCallback, useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";

import type { Lang } from "../store/useLanguageStore";

/**
 * The voice to ask for, per app language.
 *
 * Pangasinan has no text-to-speech voice on any phone, so it falls back to
 * Filipino. That is the same rule the assistant's own prompt follows for words
 * it is unsure of, and it reads far closer to Pangasinan than English does --
 * shared vocabulary, and the vowels land in roughly the right place. It is a
 * compromise, not a solution: a Pangasinan reply read by a Filipino voice is
 * understandable, not correct.
 */
const VOICE_BY_LANG: Record<Lang, string> = {
  en: "en-US",
  tl: "fil-PH",
  pag: "fil-PH",
};

/**
 * Strip what should not be read out.
 *
 * The model returns light markdown and the occasional emoji. Spoken, an
 * asterisk becomes "asterisk" and a duck emoji becomes a description, both of
 * which derail a sentence. Bullets become pauses instead, which is what they
 * mean.
 */
export function speakableText(raw: string): string {
  return (
    raw
      // Emoji and pictographs.
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
      // Bullet markers at the start of a line become a pause.
      .replace(/^\s*[*\-•]\s+/gm, ". ")
      // Emphasis markers around words.
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      // Leftover markup.
      .replace(/[*_#`]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function useReadAloud(lang: Lang) {
  // Which message is being read, so only its own button shows as active.
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Read inside Speech callbacks, which fire after the state they refer to may
  // already have changed.
  const currentId = useRef<string | null>(null);

  const stop = useCallback(() => {
    currentId.current = null;
    setSpeakingId(null);
    Speech.stop();
  }, []);

  const toggle = useCallback(
    (id: string, text: string) => {
      // Tapping the bubble that is already speaking stops it.
      if (currentId.current === id) {
        stop();
        return;
      }

      const body = speakableText(text);

      if (!body) return;

      // Replace rather than queue. Without the explicit stop, Android plays
      // the new reply after the old one finishes.
      Speech.stop();

      currentId.current = id;
      setSpeakingId(id);

      Speech.speak(body, {
        language: VOICE_BY_LANG[lang] ?? "en-US",
        // Slightly under normal. These are health instructions, often heard by
        // someone who is unwell, and the default clip is brisk for that.
        rate: 0.95,
        onDone: () => {
          if (currentId.current === id) {
            currentId.current = null;
            setSpeakingId(null);
          }
        },
        onStopped: () => {
          if (currentId.current === id) {
            currentId.current = null;
            setSpeakingId(null);
          }
        },
        onError: () => {
          currentId.current = null;
          setSpeakingId(null);
        },
      });
    },
    [lang, stop]
  );

  // Leaving the screen must not leave a voice talking over whatever comes next.
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // Switching language mid-reply would finish the sentence in the old voice.
  useEffect(() => {
    stop();
  }, [lang, stop]);

  return { speakingId, toggle, stop };
}
