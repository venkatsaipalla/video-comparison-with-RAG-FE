"use client";

import { useCallback, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Citation, streamChat } from "@/lib/api";

type MessageStatus = "complete" | "streaming" | "error";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  status: MessageStatus;
};

const SUGGESTIONS = [
  "Why did Video A outperform Video B?",
  "Compare hooks in the first 5 seconds.",
  "What should I change in my hook to improve retention?",
];

type Props = {
  sessionId: string;
  disabled?: boolean;
};

function newId() {
  return crypto.randomUUID();
}

export function ChatPanel({ sessionId, disabled }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  const updateMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming || disabled) return;

      setError(null);
      setStreaming(true);

      const assistantId = newId();

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

      let assistantText = "";
      const citations: Citation[] = [];
      let finished = false;

      try {
        await streamChat(
          sessionId,
          trimmed,
          conversationIdRef.current,
          {
            onToken: (t) => {
              assistantText += t;
              updateMessage(assistantId, {
                content: assistantText,
                citations: [...citations],
              });
            },
            onCitation: (c) => {
              citations.push(c);
              updateMessage(assistantId, {
                content: assistantText,
                citations: [...citations],
              });
            },
            onDone: (data) => {
              finished = true;
              conversationIdRef.current = data.conversation_id;
              updateMessage(assistantId, {
                content: assistantText || "No response generated.",
                citations: [...citations],
                status: "complete",
              });
            },
            onError: (msg) => {
              finished = true;
              setError(msg);
              updateMessage(assistantId, {
                content: assistantText || msg,
                status: "error",
              });
            },
          }
        );

        if (!finished) {
          updateMessage(assistantId, {
            content: assistantText || "No response received from server.",
            citations: [...citations],
            status: assistantText ? "complete" : "error",
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Chat failed";
        setError(msg);
        updateMessage(assistantId, { content: msg, status: "error" });
      } finally {
        setStreaming(false);
      }
    },
    [disabled, sessionId, streaming, updateMessage]
  );

  return (
    <div className="flex h-full min-h-[480px] flex-col rounded-2xl border border-stone-800 bg-stone-900/80">
      <div className="border-b border-stone-800 px-4 py-3">
        <h2 className="font-semibold text-stone-100">AI comparison chat</h2>
        <p className="text-xs text-stone-500">
          Streaming answers with source citations
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-stone-800 p-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled || streaming}
            onClick={() => send(s)}
            className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-300 hover:border-brand-500 hover:text-brand-500 disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-stone-500">
            Ask why one video outperformed another, compare hooks, or get
            improvement ideas.
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
                  <p className="mt-1 text-xs text-red-400">Response failed</p>
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
              disabled ? "Waiting for ingest…" : "Ask about these videos…"
            }
            disabled={disabled || streaming}
            className="flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={disabled || streaming || !input.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {streaming ? "Sending…" : "Send"}
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
