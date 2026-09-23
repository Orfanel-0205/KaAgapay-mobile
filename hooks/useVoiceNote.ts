// hooks/useVoiceNote.ts
//
// Recording a voice note for the assistant.
//
// Typing is the barrier for a lot of residents — older patients, anyone on a
// cracked screen, anyone describing a symptom they do not have the written
// word for. Speaking the question is often the only comfortable way to ask it,
// and the assistant understands the audio directly, so nothing is lost in
// transcription on the device.
//
// Two rules the UI depends on:
//
//   * the microphone is released the moment a recording stops. Holding it open
//     leaves the little recording indicator on the status bar and, on some
//     Android builds, stops other apps from using the mic until Ka-Agapay is
//     force-closed.
//   * recordings are capped. A voice note is a question, not a monologue, and
//     an accidental recording left running would upload for minutes on
//     barangay mobile data.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

/** Long enough for a symptom described unhurriedly, short enough to upload. */
const MAX_SECONDS = 90;

export interface VoiceNote {
  uri: string;
  mime: string;
  name: string;
  seconds: number;
}

export function useVoiceNote() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set when a stop is already in flight, so the auto-stop timer and a tap on
  // the button cannot both try to finish the same recording.
  const stopping = useRef(false);

  const seconds = Math.floor((state.durationMillis ?? 0) / 1000);
  const isRecording = state.isRecording;

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        setPermissionDenied(true);
        return false;
      }

      setPermissionDenied(false);

      // Required on iOS, where recording is refused outright unless the audio
      // session has been put into a recording mode first.
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      stopping.current = false;

      return true;
    } catch {
      setError("Could not start recording. Check the microphone permission.");
      return false;
    }
  }, [recorder]);

  const stop = useCallback(async (): Promise<VoiceNote | null> => {
    if (stopping.current) return null;

    stopping.current = true;

    try {
      const elapsed = Math.floor((recorder.currentTime ?? 0));

      await recorder.stop();

      // Hand the microphone back immediately. See the note at the top.
      await setAudioModeAsync({ allowsRecording: false });

      const uri = recorder.uri;

      if (!uri) return null;

      // Under a second is a mis-tap, not a question.
      if (elapsed < 1) return null;

      return {
        uri,
        mime: "audio/m4a",
        name: `voice-note-${Date.now()}.m4a`,
        seconds: elapsed,
      };
    } catch {
      setError("Could not save the recording.");
      return null;
    } finally {
      stopping.current = false;
    }
  }, [recorder]);

  const cancel = useCallback(async () => {
    if (!isRecording) return;

    stopping.current = true;

    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      // Nothing useful to say: the recording is being thrown away regardless.
    } finally {
      stopping.current = false;
    }
  }, [isRecording, recorder]);

  // Leaving the screen mid-recording must not leave the microphone open.
  useEffect(() => {
    return () => {
      if (recorder.isRecording) {
        recorder.stop().catch(() => {});
        setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      }
    };
  }, [recorder]);

  return {
    isRecording,
    seconds,
    maxSeconds: MAX_SECONDS,
    permissionDenied,
    error,
    start,
    stop,
    cancel,
  };
}
