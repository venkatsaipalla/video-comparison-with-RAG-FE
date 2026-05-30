"use client";

import { useSession } from "next-auth/react";

/** Postgres user id synced via POST /auth/google during sign-in. */
export function useBackendUserId(): string | undefined {
  const { data } = useSession();
  return data?.user?.backendUserId;
}
