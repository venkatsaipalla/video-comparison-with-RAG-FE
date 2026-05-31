"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Citation, citationsFromState, sendChat, warmupBrainApi } from "@/lib/api";
import { notifyComparisonUpdated } from "@/lib/comparison-events";
import { ChatMessagesSkeleton, Spinner } from "@/components/loaders";
import { SourcesAccordion } from "@/components/SourcesAccordion";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

type MessageStatus = "complete" | "streaming" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  status: MessageStatus;
};

type PromptSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

function buildSuggestions(
  titleA: string,
  titleB: string
): PromptSuggestion[] {
  const first =
    titleA && titleA !== "Video A" ? `the first video (“${titleA}”)` : "the first video";
  const second =
    titleB && titleB !== "Video B"
      ? `the second video (“${titleB}”)`
      : "the second video";

  return [
    {
      id: "winner",
      label: "Which one did better?",
      prompt: `Compare both videos for me. Which one did better with people watching (views, likes, comments)? Explain in simple everyday words why you think one worked better than the other.`,
    },
    {
      id: "openings",
      label: "How do they start?",
      prompt: `How does ${first} start, and how does ${second} start? Compare the openings in the first few seconds — what is each one trying to do to pull you in?`,
    },
    {
      id: "first-about",
      label: "What's the first video about?",
      prompt: `What is ${first} about? Summarize what it says in plain language, like you're explaining it to a friend who hasn't seen it.`,
    },
    {
      id: "second-about",
      label: "What's the second video about?",
      prompt: `What is ${second} about? Summarize what it says in plain language, like you're explaining it to a friend who hasn't seen it.`,
    },
    {
      id: "different",
      label: "How are they different?",
      prompt: `In simple terms, how are ${first} and ${second} different from each other? Talk about the vibe, how they speak, and what message each one is getting across.`,
    },
    {
      id: "copy",
      label: "What should I copy?",
      prompt: `If I'm making my next video and want it to do as well as whichever one performed better, what are 2–3 easy things I should try to copy? Keep it practical and avoid jargon.`,
    },
  ];
}

type Props = {
  userId: string;
  sessionId: string;
  videoIds: string[];
  /** Display names for contextual prompts (defaults to Video A / Video B). */
  videoLabels?: { a: string; b: string };
  initialMessages?: ChatMessage[];
  /** Called after backend saves the turn (reload history from API). */
  onConversationSaved?: () => void | Promise<void>;
  /** Initial load from API — skeleton in message area only. */
  loadingHistory?: boolean;
  /** Background sync after save — keeps messages visible. */
  syncingHistory?: boolean;
  disabled?: boolean;
};

function newId() {
  return crypto.randomUUID();
}

let brainWarmed = false;

export function ChatPanel({
  userId,
  sessionId,
  videoIds,
  videoLabels,
  initialMessages = [],
  onConversationSaved,
  loadingHistory = false,
  syncingHistory = false,
  disabled,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dictationBaseRef = useRef("");

  const labelA = videoLabels?.a?.trim() || "Video A";
  const labelB = videoLabels?.b?.trim() || "Video B";
  const suggestions = buildSuggestions(labelA, labelB);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (isFinal) {
      const base = dictationBaseRef.current;
      const spacer = base && !base.endsWith(" ") ? " " : "";
      dictationBaseRef.current = `${base}${spacer}${trimmed}`.trimStart();
      setInput(dictationBaseRef.current);
    } else {
      const base = dictationBaseRef.current;
      const spacer = base && !base.endsWith(" ") ? " " : "";
      setInput(`${base}${spacer}${trimmed}`.trimStart());
    }
  }, []);

  const {
    supported: speechSupported,
    listening,
    error: speechError,
    toggle: toggleDictation,
    stop: stopDictation,
  } = useSpeechRecognition({
    enabled: !disabled && !loading,
    onTranscript: handleTranscript,
  });

  useEffect(() => {
    setMessages(initialMessages);
    setInput("");
    setError(null);
    setLoading(false);
    dictationBaseRef.current = "";
    stopDictation();
  }, [sessionId, initialMessages, stopDictation]);

  useEffect(() => {
    if (disabled || loading) stopDictation();
  }, [disabled, loading, stopDictation]);

  useEffect(() => {
    if (disabled || brainWarmed) return;
    brainWarmed = true;
    void warmupBrainApi();
  }, [disabled]);

  const send = useCallback(
    async (text: string, options?: { isRetry?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed || loading || disabled) return;

      setError(null);
      setLoading(true);
      stopDictation();
      const assistantId = newId();

      if (options?.isRetry) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          const base =
            last?.role === "assistant" && last.status === "error"
              ? prev.slice(0, -1)
              : prev;
          return [
            ...base,
            {
              id: assistantId,
              role: "assistant",
              content: "",
              citations: [],
              status: "streaming",
            },
          ];
        });
      } else {
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "user", content: trimmed, status: "complete" },
          {
            id: assistantId,
            role: "assistant",
            content: "",
            citations: [],
            status: "streaming",
          },
        ]);
        setInput("");
      }

      try {
        const { answer, state } = await sendChat(userId, sessionId, trimmed);
        const citations = citationsFromState(state, videoIds);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: answer || "No response generated.",
                  citations,
                  status: "complete",
                }
              : m
          )
        );
        notifyComparisonUpdated(sessionId);
        await onConversationSaved?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Chat failed";
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: msg, status: "error" }
              : m
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [disabled, loading, onConversationSaved, sessionId, stopDictation, userId, videoIds]
  );

  function handleMicClick() {
    if (disabled || loading) return;
    if (!listening) {
      dictationBaseRef.current = input.trim() ? `${input.trim()} ` : "";
    }
    toggleDictation();
  }

  const retryLast = useCallback(() => {
    const last = messages[messages.length - 1];
    const user = messages[messages.length - 2];
    if (
      last?.role !== "assistant" ||
      last.status !== "error" ||
      user?.role !== "user"
    ) {
      return;
    }
    void send(user.content, { isRetry: true });
  }, [messages, send]);

  return (
    <div className="flex h-full min-h-[480px] flex-col rounded-2xl border border-stone-800 bg-stone-900/80">
      <div className="border-b border-stone-800 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-stone-100">AI comparison chat</h2>
            <p className="text-xs text-stone-500">
              Answers grounded in retrieved transcript evidence
            </p>
          </div>
          {syncingHistory && (
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-stone-500">
              <Spinner size="sm" />
              Saving
            </span>
          )}
        </div>
      </div>

      <div className="border-b border-stone-800 px-3 py-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-stone-500">
          Try asking
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              title={s.prompt}
              disabled={disabled || loading}
              onClick={() => send(s.prompt)}
              className="rounded-lg border border-stone-700 bg-stone-950/60 px-2.5 py-1.5 text-left text-xs text-stone-300 transition-colors hover:border-brand-500/80 hover:bg-brand-950/30 hover:text-brand-400 disabled:opacity-40"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {loadingHistory ? (
          <ChatMessagesSkeleton />
        ) : (
          <>
            {messages.length === 0 && (
              <p className="text-sm text-stone-500">
                Tap a question above, or type your own — like comparing how the two
                videos start, what each one is about, or which one did better.
              </p>
            )}
            {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.role === "user"
                ? "ml-8 rounded-lg bg-brand-600/20 p-3 text-sm"
                : "mr-4 rounded-lg bg-stone-800/80 p-3 text-sm"
            }
          >
            {msg.role === "assistant" ? (
              <>
                {msg.status === "streaming" && !msg.content ? (
                  <div className="flex items-center gap-2 text-stone-400">
                    <Spinner size="sm" />
                    <span>Thinking…</span>
                  </div>
                ) : msg.content ? (
                  <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                    {msg.content}
                  </ReactMarkdown>
                ) : null}
                {msg.status === "error" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-xs text-red-400">Response failed</p>
                    {msg.id === messages[messages.length - 1]?.id && (
                      <button
                        type="button"
                        disabled={loading || disabled}
                        onClick={retryLast}
                        className="rounded-md border border-stone-600 px-2 py-0.5 text-xs text-stone-300 hover:border-brand-500 hover:text-brand-400 disabled:opacity-40"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              msg.content
            )}
            {msg.citations && msg.citations.length > 0 && (
              <SourcesAccordion citations={msg.citations} />
            )}
          </div>
        ))}
            {error && <p className="text-sm text-red-400">{error}</p>}
          </>
        )}
      </div>

      <form
        className="border-t border-stone-800 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        {(speechError || (listening && speechSupported)) && (
          <p
            className={`mb-2 text-xs ${speechError ? "text-red-400" : "text-brand-400"}`}
          >
            {speechError ??
              "Listening… speak your question (stops when you pause)."}
          </p>
        )}
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                dictationBaseRef.current = e.target.value;
              }}
              placeholder={
                disabled
                  ? "Session unavailable"
                  : listening
                    ? "Listening…"
                    : "Ask about these videos…"
              }
              disabled={disabled || loading}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 py-2 pl-3 pr-10 text-sm outline-none focus:border-brand-500"
            />
            {speechSupported && (
              <button
                type="button"
                title={listening ? "Stop listening" : "Transcribe with voice"}
                aria-label={listening ? "Stop listening" : "Start voice transcription"}
                aria-pressed={listening}
                disabled={disabled || loading}
                onClick={handleMicClick}
                className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors disabled:opacity-40 ${
                  listening
                    ? "bg-red-950/60 text-red-400 hover:bg-red-900/60"
                    : "text-stone-500 hover:bg-stone-800 hover:text-stone-300"
                }`}
              >
                <MicIcon listening={listening} />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={disabled || loading || !input.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`}
      aria-hidden
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
