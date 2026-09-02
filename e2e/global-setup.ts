import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

export default function globalSetup() {
  const dbPath = path.resolve(__dirname, "../prisma/e2e.db");
  if (existsSync(dbPath)) rmSync(dbPath);
  if (existsSync(`${dbPath}-journal`)) rmSync(`${dbPath}-journal`);

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: "inherit",
  });
}
