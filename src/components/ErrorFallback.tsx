"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { classifyError, globalErrorLogger } from "@/lib/error-handling";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

/** Shared UI for App Router error boundaries (`error.tsx` files). */
export function ErrorFallback({
  error,
  reset,
  title = "Something went wrong",
}: ErrorFallbackProps) {
  const classification = classifyError(error);

  useEffect(() => {
    globalErrorLogger.log(error, title);
  }, [error, title]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <Card className="w-full border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{classification.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="stellar" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
