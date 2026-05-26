"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Citation, citationsFromState, sendChat, warmupBrainApi } from "@/lib/api";

type MessageStatus = "complete" | "streaming" | "error";

type Message = {
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
  sessionId: string;
  videoIds: string[];
  /** Display names for contextual prompts (defaults to Video A / Video B). */
  videoLabels?: { a: string; b: string };
  disabled?: boolean;
};

function newId() {
  return crypto.randomUUID();
}

export function ChatPanel({
  sessionId,
  videoIds,
  videoLabels,
  disabled,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelA = videoLabels?.a?.trim() || "Video A";
  const labelB = videoLabels?.b?.trim() || "Video B";
  const suggestions = buildSuggestions(labelA, labelB);

  useEffect(() => {
    if (disabled) return;
    void warmupBrainApi();
  }, [disabled, sessionId]);

  const send = useCallback(
    async (text: string, options?: { isRetry?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed || loading || disabled) return;

      setError(null);
      setLoading(true);
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
        const { answer, state } = await sendChat(sessionId, trimmed);
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
    [disabled, loading, sessionId, videoIds]
  );

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
        <h2 className="font-semibold text-stone-100">AI comparison chat</h2>
        <p className="text-xs text-stone-500">
          Answers grounded in retrieved transcript evidence
        </p>
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
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-500" />
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
              <div className="mt-3 space-y-2 border-t border-stone-700 pt-2">
                <p className="text-xs font-medium text-stone-400">Sources</p>
                {msg.citations.map((c) => (
                  <div
                    key={c.chunk_id}
                    className="rounded border border-stone-700 bg-stone-950/50 p-2 text-xs"
                  >
                    <span className="font-medium text-brand-500">
                      {c.video_label}
                    </span>
                    {c.start_sec != null && (
                      <span className="text-stone-500">
                        {" "}
                        · {formatTs(c.start_sec)}
                        {c.end_sec != null && `–${formatTs(c.end_sec)}`}
                      </span>
                    )}
                    <p className="mt-1 text-stone-400">{c.excerpt}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <form
        className="border-t border-stone-800 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              disabled ? "Session unavailable" : "Ask about these videos…"
            }
            disabled={disabled || loading}
            className="flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
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

function formatTs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
