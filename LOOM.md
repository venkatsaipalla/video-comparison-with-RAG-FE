# Loom demo script (5–7 min)

## Before recording

1. Apply Supabase migration and set `.env` on backend + `.env.local` on frontend.
2. Wake Render/Fly API (free tier cold start ~30s).
3. Pre-test two URLs that ingest successfully.

### Suggested URL pairs

- **Video A**: any public YouTube with English captions (education or creator tips).
- **Video B**: public TikTok or Instagram Reel in the same niche.

## Recording flow

1. **Intro (30s)** — “Side-by-side ingest of two social videos into Supabase pgvector, then cited streaming RAG chat.”
2. **Ingest (1–2 min)** — Paste URLs, click Analyze, show polling → `ready` and engagement metrics.
3. **Chat 1** — “Why did Video A outperform Video B?” — point at citation chips and engagement rates.
4. **Chat 2** — “Compare hooks in the first 5 seconds.” — highlight hook-window retrieval.
5. **Chat 3** — “What should I change in my hook?” — actionable bullets.
6. **Architecture (1 min)** — Why pgvector on Supabase, chunking by time, cost knobs, TikTok/IG caveats.
7. **Refresh** — Reload page, send follow-up to show conversation memory.

## Talking points for CEO call

- Trade-off: v1 dense retrieval vs full hybrid+rereank at 10k users.
- Cost math: embed once per URL hash cache; gpt-4o-mini for chat.
- Failure modes: private Reels, no captions, platform rate limits.
