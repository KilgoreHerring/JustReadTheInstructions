import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

// Comma-separated allowlist of permitted email addresses.
// If empty, all Google accounts can sign in (useful for initial setup).
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Comma-separated allowlist of permitted email domains (e.g. "addleshawgoddard.com").
// Users with an email at any listed domain can sign in without being in ALLOWED_EMAILS.
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user }) {
      if (ALLOWED_EMAILS.length === 0 && ALLOWED_DOMAINS.length === 0)
        return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (ALLOWED_EMAILS.includes(email)) return true;
      const domain = email.split("@")[1];
      if (domain && ALLOWED_DOMAINS.includes(domain)) return true;
      return false;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as { role?: string }).role ?? "analyst";
      return session;
    },
  },
});
