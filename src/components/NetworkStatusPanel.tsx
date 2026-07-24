"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { NetworkConfig, StellarNetwork } from "@/types";

interface NetworkStatusPanelProps {
  config: NetworkConfig;
  className?: string;
}

const NETWORK_BADGE_VARIANT: Record<
  StellarNetwork,
  "ready" | "warning" | "secondary"
> = {
  mainnet: "ready",
  testnet: "secondary",
  custom: "warning",
};

const NETWORK_LABEL: Record<StellarNetwork, string> = {
  mainnet: "Mainnet",
  testnet: "Testnet",
  custom: "Custom",
};

export function NetworkStatusPanel({
  config,
  className,
}: NetworkStatusPanelProps) {
  const { horizonNetwork, sorobanNetwork, mismatched, warnings } = config;

  return (
    <Card
      className={cn(
        mismatched
          ? "border-destructive/40 bg-destructive/5"
          : "border-stellar-cyan/20 bg-gradient-to-br from-stellar-purple/5 to-stellar-cyan/5",
        className
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {mismatched ? (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          )}
          Network configuration
        </CardTitle>
        <CardDescription>
          The Stellar network the dashboard is validating contributor
          funding and Soroban events against.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Horizon:</span>
          <Badge variant={NETWORK_BADGE_VARIANT[horizonNetwork]}>
            {NETWORK_LABEL[horizonNetwork]}
          </Badge>
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Soroban RPC:</span>
            <Badge variant={NETWORK_BADGE_VARIANT[sorobanNetwork]}>
              {NETWORK_LABEL[sorobanNetwork]}
            </Badge>
          </span>
        </div>

        {mismatched && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            <p className="font-semibold">Network mismatch detected</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {!mismatched &&
          warnings.map((warning) => (
            <p key={warning} className="text-muted-foreground">
              {warning}
            </p>
          ))}
      </CardContent>
    </Card>
  );
}
