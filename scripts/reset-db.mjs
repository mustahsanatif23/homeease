import { rm } from "node:fs/promises";
import path from "node:path";

const file = path.join(process.cwd(), "prisma", "dev.db");
await rm(file, { force: true });
await rm(`${file}-journal`, { force: true });
console.log("Removed local SQLite database (if it existed).");
