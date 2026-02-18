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
      if (ALLOWED_EMAILS.length === 0) return true;
      const email = user.email?.toLowerCase();
      if (!email || !ALLOWED_EMAILS.includes(email)) {
        return false;
      }
      return true;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as { role?: string }).role ?? "analyst";
      return session;
    },
  },
});
