const STORAGE_KEY = "creatorjoy_user_id";

/** Stable anonymous id sent as `user_id` on every brain API call. */
export function getUserId(): string {
  if (typeof window === "undefined") return "anonymous";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
