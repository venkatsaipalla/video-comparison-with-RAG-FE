type SpinnerProps = {
  size?: "sm" | "md";
  className?: string;
};

/** Inline spinner for buttons and section headers. */
export function Spinner({ size = "sm", className = "" }: SpinnerProps) {
  const dim = size === "sm" ? "h-3.5 w-3.5 border-[2px]" : "h-5 w-5 border-2";
  return (
    <span
      className={`inline-block shrink-0 animate-spin rounded-full border-stone-600 border-t-brand-500 ${dim} ${className}`}
      aria-hidden
    />
  );
}

function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-stone-800/80 ${className}`}
      aria-hidden
    />
  );
}

/** Sidebar history list placeholder. */
export function SidebarHistorySkeleton() {
  return (
    <ul className="space-y-2 px-2 py-1" aria-label="Loading history">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="rounded-lg border border-stone-800/60 p-2">
          <Bone className="mb-1.5 h-3.5 w-full" />
          <Bone className="h-2 w-12" />
        </li>
      ))}
    </ul>
  );
}

/** Video card placeholder (thumbnail + metrics). */
export function VideoCardSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5">
      <span className="mb-3 inline-block rounded-full bg-stone-800 px-3 py-1 text-xs font-medium uppercase tracking-wide text-stone-600">
        {label}
      </span>
      <Bone className="mb-4 aspect-video w-full rounded-lg" />
      <Bone className="mb-2 h-5 w-3/4" />
      <Bone className="mb-4 h-3 w-1/2" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i}>
            <Bone className="mb-1 h-2.5 w-12" />
            <Bone className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Chat message area placeholder. */
export function ChatMessagesSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading conversation">
      <div className="ml-8 space-y-2">
        <Bone className="h-10 w-2/3 rounded-lg" />
      </div>
      <div className="mr-4 space-y-2">
        <Bone className="h-16 w-full rounded-lg" />
        <Bone className="h-4 w-4/5" />
      </div>
      <div className="ml-8">
        <Bone className="h-8 w-1/2 rounded-lg" />
      </div>
    </div>
  );
}

/** Compact progress for form submit / ingest. */
export function InlineProgress({
  label,
  detail,
}: {
  label: string;
  detail?: string;
}) {
  return (
    <div
      className="rounded-xl border border-brand-800/40 bg-brand-950/20 px-4 py-3"
      role="status"
    >
      <div className="flex items-center gap-2 text-sm text-brand-300">
        <Spinner />
        <span>{label}</span>
      </div>
      {detail && <p className="mt-1 text-xs text-stone-500">{detail}</p>}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-stone-800">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-500/70" />
      </div>
    </div>
  );
}
