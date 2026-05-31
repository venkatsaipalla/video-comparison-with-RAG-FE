"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
};

type Options = {
  /** When false, recognition is not initialized. */
  enabled?: boolean;
  lang?: string;
  onTranscript: (text: string, isFinal: boolean) => void;
};

export function useSpeechRecognition({
  enabled = true,
  lang = "en-US",
  onTranscript,
}: Options) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    if (
      !enabled ||
      typeof window === "undefined" ||
      !("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      setSupported(false);
      return;
    }

    setSupported(true);

    const w = window as SpeechWindow;
    const SpeechRecognition =
      w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = lang;

    recognitionInstance.onresult = (event) => {
      let transcript = "";
      let isFinal = false;

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) isFinal = true;
      }

      const trimmed = transcript.trim();
      if (trimmed) onTranscriptRef.current(trimmed, isFinal);
    };

    recognitionInstance.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setError(
        event.error === "not-allowed"
          ? "Microphone access was denied."
          : "Voice input failed. Try again."
      );
      setListening(false);
    };

    recognitionInstance.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognitionInstance;

    return () => {
      recognitionInstance.abort();
      recognitionRef.current = null;
    };
  }, [enabled, lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    setError(null);
    try {
      recognition.start();
      setListening(true);
    } catch {
      // Chrome may reject re-start on the same instance — recreate once.
      const w = window as SpeechWindow;
      const SpeechRecognition =
        w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const next = new SpeechRecognition();
      next.continuous = false;
      next.interimResults = true;
      next.lang = lang;
      next.onresult = recognition.onresult;
      next.onerror = recognition.onerror;
      next.onend = recognition.onend;
      recognitionRef.current = next;

      try {
        next.start();
        setListening(true);
      } catch {
        setError("Could not start voice input.");
        setListening(false);
      }
    }
  }, [lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, error, start, stop, toggle };
}
