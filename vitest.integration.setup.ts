import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const testDbPath = path.resolve(__dirname, "prisma/test.db");

export default function setup() {
  if (existsSync(testDbPath)) rmSync(testDbPath);
  if (existsSync(`${testDbPath}-journal`)) rmSync(`${testDbPath}-journal`);

  execSync("npx prisma migrate deploy", {
    cwd: __dirname,
    env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
    stdio: "inherit",
  });
}
