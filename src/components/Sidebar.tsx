"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { listComparisons, type ComparisonListItem } from "@/lib/api";
import { COMPARISON_UPDATED } from "@/lib/comparison-events";
import {
  SidebarHistorySkeleton,
  Spinner,
} from "@/components/loaders";
import { useBackendUserId } from "@/hooks/useBackendUser";

function comparisonLabel(item: ComparisonListItem): string {
  if (item.title?.trim()) return item.title;
  try {
    const a = new URL(item.video_a_url).hostname.replace("www.", "");
    const b = new URL(item.video_b_url).hostname.replace("www.", "");
    return `${a} vs ${b}`;
  } catch {
    return "Video comparison";
  }
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userId = useBackendUserId();
  const [items, setItems] = useState<ComparisonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setError(null);
    if (!hasLoadedRef.current) setLoading(true);
    else setRefreshing(true);
    try {
      const rows = await listComparisons(userId);
      setItems(rows);
      hasLoadedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const onUpdate = () => void refresh();
    window.addEventListener(COMPARISON_UPDATED, onUpdate);
    return () => window.removeEventListener(COMPARISON_UPDATED, onUpdate);
  }, [refresh]);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-stone-800 bg-stone-950/80">
      <div className="border-b border-stone-800 p-4">
        <p className="text-xs font-medium uppercase tracking-widest text-brand-500">
          Creatorjoy
        </p>
        <p className="mt-1 truncate text-sm text-stone-300">
          {session?.user?.name ?? session?.user?.email ?? "Signed in"}
        </p>
      </div>

      <div className="p-3">
        <Link
          href="/"
          className="flex w-full items-center justify-center rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + New comparison
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
            History
          </p>
          {refreshing && (
            <span className="flex items-center gap-1 text-[10px] text-stone-500">
              <Spinner size="sm" />
              Updating
            </span>
          )}
        </div>
        {loading && <SidebarHistorySkeleton />}
        {error && !loading && (
          <p className="px-2 py-2 text-xs text-red-400">{error}</p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="px-2 py-3 text-xs text-stone-500">
            No comparisons yet. Start one above.
          </p>
        )}
        {!loading && (
          <ul className="space-y-0.5">
            {items.map((item) => {
            const href = `/c/${item.id}`;
            const active = pathname === href;
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  className={`block rounded-lg px-2 py-2 text-sm transition-colors ${
                    active
                      ? "bg-stone-800 text-stone-100"
                      : "text-stone-400 hover:bg-stone-900 hover:text-stone-200"
                  }`}
                >
                  <span className="line-clamp-2">{comparisonLabel(item)}</span>
                  <span className="mt-0.5 block text-[10px] text-stone-600">
                    {formatWhen(item.updated_at)}
                  </span>
                </Link>
              </li>
            );
          })}
          </ul>
        )}
      </div>

      <div className="border-t border-stone-800 p-3">
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: "/login" })}
          className="w-full rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-400 hover:border-stone-600 hover:text-stone-200"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
