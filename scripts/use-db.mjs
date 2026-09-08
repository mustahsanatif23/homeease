#!/usr/bin/env node
/**
 * Switches the Prisma datasource between SQLite (local, zero setup) and
 * PostgreSQL (needed for Vercel and any other serverless host).
 *
 *   npm run db:postgres
 *   npm run db:sqlite
 */
import { readFile, writeFile } from "node:fs/promises";

const target = process.argv[2];
if (!["sqlite", "postgresql"].includes(target)) {
  console.error("Usage: node scripts/use-db.mjs <sqlite|postgresql>");
  process.exit(1);
}

const path = new URL("../prisma/schema.prisma", import.meta.url);
const schema = await readFile(path, "utf8");
const updated = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${target}"`);

if (updated === schema && !schema.includes(`provider = "${target}"`)) {
  console.error("Could not find the datasource provider line in prisma/schema.prisma.");
  process.exit(1);
}

await writeFile(path, updated);
console.log(`Prisma datasource is now "${target}".`);
console.log(
  target === "postgresql"
    ? "Next: set DATABASE_URL to your Postgres connection string, then run `npm run db:push && npm run db:seed`."
    : "Next: set DATABASE_URL=\"file:./dev.db\" in .env, then run `npm run setup`.",
);
