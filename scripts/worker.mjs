/**
 * Durable queue worker entrypoint.
 *
 * Boots the Next.js server-side background-queue module and keeps the process
 * alive so registered job handlers (recheck.batch, recheck.single) can process
 * queued Horizon re-check work outside of a web request lifecycle.
 *
 * Usage:
 *   npm run worker
 *   node scripts/worker.mjs
 *
 * Environment variables are read from the process environment; copy .env.local
 * and export the values before starting the worker in production, or use a
 * tool like `dotenv-cli`:
 *   npx dotenv-cli -e .env.local -- npm run worker
 *
 * The worker runs until the process is terminated (SIGINT / SIGTERM).
 */

import { createRequire } from "node:module";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

// ------------------------------------------------------------------
// Bootstrap TypeScript path aliases (@/*) so the compiled queue-worker
// module can resolve its imports when run through tsx / ts-node.
// We lean on the project's own tsconfig path mapping and tsx's loader.
// ------------------------------------------------------------------

const projectRoot = resolvePath(new URL(".", import.meta.url).pathname, "..");

// Graceful shutdown
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] Received ${signal}, shutting down gracefully…`);
  // Give in-flight jobs a moment to finish
  setTimeout(() => {
    console.log("[worker] Exiting.");
    process.exit(0);
  }, 2000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ------------------------------------------------------------------
// Validate minimal required environment variables before importing any
// module that touches the DB or external services.
// ------------------------------------------------------------------

const REQUIRED_ENV = ["DATABASE_URL", "NEXTAUTH_SECRET"];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error(
    `[worker] Missing required environment variable(s): ${missing.join(", ")}\n` +
      `         Copy .env.local and export variables before starting the worker.`
  );
  process.exit(1);
}

// ------------------------------------------------------------------
// Load the queue-worker module.
//
// queue-worker.ts uses `import "server-only"` which is a no-op marker
// package — it just exports nothing and is safe outside Next.js.
//
// We use tsx (TypeScript execution) if available, otherwise expect the
// project to be pre-compiled. In CI / production you can run:
//   node --import tsx/esm scripts/worker.mjs
// or just:
//   npx tsx scripts/worker.mjs
// ------------------------------------------------------------------

try {
  // Attempt dynamic import of the compiled/transpiled queue-worker.
  // When invoked via `npx tsx scripts/worker.mjs` (the recommended way),
  // tsx handles the TypeScript transform automatically.
  const workerPath = resolvePath(projectRoot, "src/lib/queue-worker.ts");
  const { backgroundQueue } = await import(pathToFileURL(workerPath).href);

  if (!backgroundQueue) {
    throw new Error("backgroundQueue not exported from queue-worker module");
  }

  const registeredHandlers = backgroundQueue.getHandlerNames?.() ?? ["recheck.batch", "recheck.single"];
  console.log(
    `[worker] Started. Registered handlers: ${registeredHandlers.join(", ")}`
  );
  console.log("[worker] Waiting for queued jobs… (Ctrl+C to stop)");
} catch (err) {
  console.error("[worker] Failed to load queue-worker module:", err.message);
  console.error(
    "[worker] Hint: run the worker via `npx tsx scripts/worker.mjs` to enable TypeScript support."
  );
  process.exit(1);
}

// Keep the process alive
setInterval(() => {}, 1 << 30);
