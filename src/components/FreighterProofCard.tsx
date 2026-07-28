"use client";

import React, { useEffect, useState } from "react";
import { Copy, ShieldAlert, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WalletProofInfo } from "@/types";

declare global {
  interface Window {
    freighter?: unknown;
    freighterApi?: unknown;
  }
}

interface FreighterProofCardProps {
  proof: WalletProofInfo;
  addressReady: boolean;
  className?: string;
}

export function FreighterProofCard({
  proof,
  addressReady,
  className,
}: FreighterProofCardProps) {
  const [freighterDetected, setFreighterDetected] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setFreighterDetected(
      typeof window !== "undefined" &&
        Boolean(window.freighterApi || window.freighter)
    );
  }, []);

  async function copyChallenge() {
    await navigator.clipboard.writeText(proof.challenge);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card className={cn("border-stellar-purple/20", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {freighterDetected ? (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          )}
          Freighter ownership proof
        </CardTitle>
        <CardDescription>
          Use Freighter&apos;s message-signing flow to document control of the
          payout wallet before maintainers approve Wave payouts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p
          className={cn(
            "rounded-md border px-3 py-2",
            freighterDetected
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
              : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
          )}
          role="status"
        >
          {freighterDetected
            ? "Freighter detected in this browser. You can use it to sign the ownership challenge."
            : "Freighter is not detected in this browser. You can still copy the challenge and sign it later from a Freighter-enabled session."}
        </p>

        <ol className="list-decimal space-y-2 pl-5">
          {proof.instructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="space-y-2">
          <p className="font-medium">Challenge text</p>
          <pre
            className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap"
            aria-label="Freighter ownership proof challenge"
          >
            {proof.challenge}
          </pre>
        </div>

        <p className="text-muted-foreground">{proof.fallback}</p>

        <Button
          variant="outline"
          onClick={() => void copyChallenge()}
          disabled={!addressReady}
          aria-disabled={!addressReady}
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied challenge" : "Copy challenge"}
        </Button>

        {!addressReady && (
          <p className="text-xs text-muted-foreground">
            Enter a Stellar address first so the challenge references the payout
            wallet you are registering.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
