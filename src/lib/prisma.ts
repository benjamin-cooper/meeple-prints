import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function createPrisma() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  // A local file: URL needs nothing else. A hosted libsql/Turso URL
  // (libsql://...) needs its auth token passed separately.
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const adapter = new PrismaLibSql(authToken ? { url, authToken } : { url });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
