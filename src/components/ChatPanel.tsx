"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Citation, streamChat } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
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

export function ChatPanel({ sessionId, disabled }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    if (!text.trim() || streaming || disabled) return;
    setError(null);
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setStreaming(true);

    let assistant = "";
    const citations: Citation[] = [];

    setMessages((m) => [...m, { role: "assistant", content: "", citations: [] }]);

    await streamChat(sessionId, text.trim(), conversationId, {
      onToken: (t) => {
        assistant += t;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: assistant,
            citations: [...citations],
          };
          return copy;
        });
      },
      onCitation: (c) => {
        citations.push(c);
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: assistant,
            citations: [...citations],
          };
          return copy;
        });
      },
      onDone: (data) => {
        setConversationId(data.conversation_id);
        setStreaming(false);
      },
      onError: (msg) => {
        setError(msg);
        setStreaming(false);
      },
    });
  }

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
        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === "user"
                ? "ml-8 rounded-lg bg-brand-600/20 p-3 text-sm"
                : "mr-4 rounded-lg bg-stone-800/80 p-3 text-sm"
            }
          >
            {msg.role === "assistant" ? (
              <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                {msg.content || "…"}
              </ReactMarkdown>
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
            Send
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
