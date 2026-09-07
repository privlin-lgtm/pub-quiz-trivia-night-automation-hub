import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/.claude/**"],
    globalSetup: "./vitest.integration.setup.ts",
    env: {
      DATABASE_URL: `file:${path.resolve(__dirname, "prisma/test.db")}`,
    },
    fileParallelism: false,
  },
});
