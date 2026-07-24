"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { TrustlineStatusBadge } from "@/components/TrustlineStatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeNextAction, WIZARD_ACTION_COPY } from "@/lib/action-lookup";
import { cn } from "@/lib/utils";
import type { HorizonCheckResult } from "@/types";

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AddressInput({
  value,
  onChange,
  disabled,
  className,
}: AddressInputProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<HorizonCheckResult | null>(null);
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), 500);
    return () => clearTimeout(timer);
  }, [value]);

  const checkAddress = useCallback(async (address: string) => {
    if (!address.trim()) {
      setResult(null);
      return;
    }

    setChecking(true);
    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = (await response.json()) as HorizonCheckResult;
      setResult(data);
    } catch {
      setResult({
        funded: false,
        trustline: false,
        xlm_balance: "0",
        errors: ["Unable to reach validation service"],
        readiness: "not_ready",
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAddress(debouncedValue);
  }, [debouncedValue, checkAddress]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <Label htmlFor="stellar-address">Stellar public address (G...)</Label>
        <div className="relative">
          <Input
            id="stellar-address"
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="font-mono pr-10"
            spellCheck={false}
            autoComplete="off"
          />
          {checking && (
            <Loader2 className="absolute right-3 top-2.5 h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {result && (
        <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">Readiness</span>
            <TrustlineStatusBadge status={result.readiness} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Funded</dt>
              <dd className="font-medium">{result.funded ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">USDC trustline</dt>
              <dd className="font-medium">{result.trustline ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">XLM balance</dt>
              <dd className="font-medium">{result.xlm_balance} XLM</dd>
            </div>
          </dl>
          {result.errors.length > 0 && (
            <ul className="text-sm text-destructive space-y-1">
              {result.errors.map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">
            {WIZARD_ACTION_COPY[computeNextAction(result)]}
          </p>
        </div>
      )}
    </div>
  );
}

export type { HorizonCheckResult };
