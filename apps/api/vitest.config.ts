import { defineConfig } from "vitest/config";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Load env from monorepo root first, then local apps/api/.env override if present.
// Integration specs use TEST_DATABASE_URL (isolated cmr_test DB).
// Black-box HTTP specs use the live API which connects to DATABASE_URL (cmr_dev).
loadEnv({ path: resolve(__dirname, "../../.env") });
loadEnv({ path: resolve(__dirname, ".env"), override: true });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Critical: serial execution to avoid races on shared resources
    // (audit chain advisory lock + workflow state).
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    sequence: { concurrent: false },
    fileParallelism: false,
    include: ["src/**/*.spec.ts", "test/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules", "dist", "**/*.d.ts", "**/*.spec.ts"],
    },
  },
});
