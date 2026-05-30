import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { getBackendApiUrl } from "@/lib/env";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const apiKey = process.env.BRAIN_API_KEY?.trim();
        const res = await fetch(`${getBackendApiUrl()}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "X-API-Key": apiKey } : {}),
          },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return null;

        const user = (await res.json()) as {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
        };
        if (!user?.id) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          image: user.avatar_url ?? null,
          backendUserId: user.id,
        } as any;
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.id_token && !token.backendUserId) {
        const apiKey = process.env.BRAIN_API_KEY?.trim();
        const res = await fetch(`${getBackendApiUrl()}/auth/google`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { "X-API-Key": apiKey } : {}),
          },
          body: JSON.stringify({ id_token: account.id_token }),
        });
        if (res.ok) {
          const user = (await res.json()) as { id: string };
          token.backendUserId = user.id;
        }
      }
      // Credentials provider returns backend user id already.
      if ((token as any).backendUserId) {
        token.backendUserId = (token as any).backendUserId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.backendUserId) {
        session.user.backendUserId = token.backendUserId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
