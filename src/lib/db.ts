import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * A libSQL-backed client is the same code path locally and in production:
 * a local `file:` path (the default, unset DATABASE_URL) or a real hosted
 * Turso database (DATABASE_URL=libsql://..., DATABASE_AUTH_TOKEN set) — see
 * .env.example. This replaces Prisma's previous native query-engine binary,
 * which needs a writable local file on disk and doesn't survive a
 * serverless deploy's ephemeral/read-only filesystem or per-invocation cold
 * starts (see prisma.config.ts for the CLI side of this same change).
 */
function createClient(): PrismaClient {
  const adapter = new PrismaLibSQL({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
