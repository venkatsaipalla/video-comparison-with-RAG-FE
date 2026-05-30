import { VideoSummary, embedUrl, formatRate } from "@/lib/api";
import { VideoCardSkeleton } from "@/components/loaders";

type Props = {
  label: string;
  video: VideoSummary | null;
  loading?: boolean;
};

export function VideoCard({ label, video, loading }: Props) {
  if (loading) {
    return <VideoCardSkeleton label={label} />;
  }

  if (!video) {
    return (
      <Card label={label}>
        <p className="text-stone-400">Waiting for video data…</p>
      </Card>
    );
  }

  const embed = embedUrl(video.url);
  const eng = video.engagement || {};

  return (
    <Card label={label}>
      {video.ingest_status === "failed" && (
        <div className="mb-3 rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
          Ingest failed: {video.ingest_error || "Unknown error"}
        </div>
      )}
      {embed ? (
        <div className="mb-4 aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={embed}
            title={video.title || label}
            className="h-full w-full"
            allowFullScreen
          />
        </div>
      ) : video.thumbnail_url ? (
        <img
          src={video.thumbnail_url}
          alt={video.title || label}
          className="mb-4 aspect-video w-full rounded-lg object-cover"
        />
      ) : null}
      <h3 className="text-lg font-semibold text-stone-50">
        {video.title || "Untitled"}
      </h3>
      <p className="text-sm text-stone-400">
        {video.creator} · {video.platform}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Views" value={formatNum(video.views)} />
        <Metric label="Likes" value={formatNum(video.likes)} />
        <Metric label="Comments" value={formatNum(video.comments)} />
        <Metric label="Like rate" value={formatRate(eng.like_rate)} />
        <Metric label="Comment rate" value={formatRate(eng.comment_rate)} />
        <Metric label="Engagement" value={formatRate(eng.engagement_rate)} />
      </dl>
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm text-brand-500 hover:underline"
      >
        Open original ↗
      </a>
    </Card>
  );
}

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5 shadow-xl backdrop-blur">
      <span className="mb-3 inline-block rounded-full bg-brand-600/20 px-3 py-1 text-xs font-medium uppercase tracking-wide text-brand-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-100">{value}</dd>
    </div>
  );
}

function formatNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}
