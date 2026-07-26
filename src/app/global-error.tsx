"use client";

import { useEffect } from "react";

import { classifyError, globalErrorLogger } from "@/lib/error-handling";

import "./globals.css";

/**
 * Root-level error boundary. Catches errors thrown by the root layout
 * itself, which `error.tsx` boundaries in nested segments cannot — Next.js
 * requires this file to render its own `<html>`/`<body>` since it replaces
 * the root layout when it activates.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const classification = classifyError(error);

  useEffect(() => {
    globalErrorLogger.log(error, "root-layout");
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background font-sans text-foreground">
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-muted-foreground">
            {classification.message}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
