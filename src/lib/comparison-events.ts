/** Fired after a chat turn is saved on the backend (sidebar refresh). */
export const COMPARISON_UPDATED = "cj:comparison-updated";

/** Fired after a comparison is deleted. */
export const COMPARISON_DELETED = "cj:comparison-deleted";

export function notifyComparisonUpdated(comparisonId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMPARISON_UPDATED, { detail: { comparisonId } })
  );
}

export function notifyComparisonDeleted(comparisonId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMPARISON_DELETED, { detail: { comparisonId } })
  );
}
