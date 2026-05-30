"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

async function signup(email: string, password: string): Promise<void> {
  const res = await fetch("/api/brain/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: unknown };
    const msg = typeof err.detail === "string" ? err.detail : "Sign up failed";
    throw new Error(msg);
  }
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(email.trim(), password);
      await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: true,
        callbackUrl: "/",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="mb-2 text-sm font-medium uppercase tracking-widest text-brand-500">
        Creatorjoy
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-stone-50">
        Create your account
      </h1>
      <p className="mt-3 text-stone-400">
        Sign up with email. You can also use Google on the sign-in page.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <label className="block">
          <span className="text-sm text-stone-400">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-stone-100 outline-none focus:border-brand-500"
          />
        </label>
        <label className="block">
          <span className="text-sm text-stone-400">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-stone-100 outline-none focus:border-brand-500"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-stone-500">
        Already have an account?{" "}
        <Link className="text-brand-500 hover:text-brand-400" href="/login">
          Sign in
        </Link>
      </p>
    </main>
  );
}

