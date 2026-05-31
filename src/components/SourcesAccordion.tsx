"use client";

import type { Citation } from "@/lib/api";

type Props = {
  citations: Citation[];
};

function formatTs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatRange(start: number | null, end: number | null): string | null {
  if (start == null) return null;
  const a = formatTs(start);
  if (end == null) return a;
  return `${a}–${formatTs(end)}`;
}

function groupByVideo(citations: Citation[]): Map<string, Citation[]> {
  const groups = new Map<string, Citation[]>();
  for (const c of citations) {
    const list = groups.get(c.video_label) ?? [];
    list.push(c);
    groups.set(c.video_label, list);
  }
  return groups;
}

export function SourcesAccordion({ citations }: Props) {
  if (citations.length === 0) return null;

  const groups = groupByVideo(citations);
  const count = citations.length;

  return (
    <details className="sources-accordion mt-3 border-t border-stone-700/80 pt-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-1 text-xs font-medium text-stone-400 transition-colors hover:text-brand-400 [&::-webkit-details-marker]:hidden">
        <span className="sources-chevron text-[10px] text-stone-500">▶</span>
        <span>
          Sources · {count} retrieved {count === 1 ? "chunk" : "chunks"}
        </span>
        <span className="rounded-full bg-stone-800 px-1.5 py-0.5 text-[10px] font-normal text-stone-500">
          RAG
        </span>
      </summary>

      <div className="mt-2 space-y-3 pl-1">
        {[...groups.entries()].map(([label, chunks]) => (
          <details
            key={label}
            className="sources-accordion rounded-lg border border-stone-800 bg-stone-950/40"
            open
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-brand-400 [&::-webkit-details-marker]:hidden">
              <span className="sources-chevron text-[10px] text-stone-500">
                ▶
              </span>
              <span className="line-clamp-1">{label}</span>
              <span className="ml-auto shrink-0 text-[10px] font-normal text-stone-600">
                {chunks.length} {chunks.length === 1 ? "chunk" : "chunks"}
              </span>
            </summary>

            <ul className="space-y-2 border-t border-stone-800/80 px-3 py-2">
              {chunks.map((c) => {
                const range = formatRange(c.start_sec, c.end_sec);
                return (
                  <li
                    key={c.chunk_id}
                    className="rounded-md border border-stone-800/60 bg-stone-900/50 p-2.5 text-xs"
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      {range && (
                        <span className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-[10px] text-brand-300">
                          {range}
                        </span>
                      )}
                      {c.rerank_score != null && (
                        <span
                          className="text-[10px] text-stone-600"
                          title="Retrieval relevance score"
                        >
                          score {c.rerank_score.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed text-stone-400">{c.excerpt}</p>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
    </details>
  );
}
