/**
 * Voice dictation helpers (Web Speech API timers).
 */

export const DICTATION_SILENCE_MS = 6000;

/** Window timeout id (`setTimeout`). */
export type SilenceTimerHandle = ReturnType<typeof setTimeout> | null;

/** Clear an active silence countdown. */
export function clearDictationSilenceTimer(timerRef: { current: SilenceTimerHandle }): void {
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

/**
 * If the microphone stays idle for {@link DICTATION_SILENCE_MS} after the last transcript
 * (`onresult`), stop recognition so the UX can flip to Processing.
 */
export function scheduleDictationSilenceStop(options: {
  timerRef: { current: SilenceTimerHandle };
  silenceMs?: number;
  isListening: () => boolean;
  /** Set listening=false, then stop/abort recognition (order matters for {@code onend}). */
  stopRecognition: () => void;
  onSilenceStop: () => void;
}): void {
  const {
    timerRef,
    silenceMs = DICTATION_SILENCE_MS,
    isListening,
    stopRecognition,
    onSilenceStop,
  } = options;

  clearDictationSilenceTimer(timerRef);
  timerRef.current = window.setTimeout(() => {
    timerRef.current = null;
    if (!isListening()) {
      return;
    }
    stopRecognition();
    onSilenceStop();
  }, silenceMs);
}
