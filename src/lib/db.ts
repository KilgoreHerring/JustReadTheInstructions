import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  // Prefer tractable_DATABASE_URL (Neon via Vercel integration), fall back to DATABASE_URL
  const url = process.env.tractable_DATABASE_URL || process.env.DATABASE_URL || "";
  // Use Neon adapter for direct Neon/Vercel Postgres connections
  if (url.includes("neon.tech") || url.includes("neon-")) {
    const adapter = new PrismaNeon({ connectionString: url });
    return new PrismaClient({ adapter }) as unknown as PrismaClient;
  }
  // Standard client for local dev (localhost)
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
