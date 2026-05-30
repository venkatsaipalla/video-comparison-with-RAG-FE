/** Fired after a chat turn is saved on the backend (sidebar refresh). */
export const COMPARISON_UPDATED = "cj:comparison-updated";

export function notifyComparisonUpdated(comparisonId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMPARISON_UPDATED, { detail: { comparisonId } })
  );
}
