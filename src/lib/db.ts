import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "";
  // Use Neon adapter for direct Neon/Vercel Postgres connections
  // Skip it for Prisma Accelerate URLs (db.prisma.io) which work with standard client
  if (url.includes("neon.tech") || url.includes("neon-")) {
    const adapter = new PrismaNeon({ connectionString: url });
    return new PrismaClient({ adapter }) as unknown as PrismaClient;
  }
  // Standard client for local dev (localhost) and Prisma Accelerate (db.prisma.io)
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
