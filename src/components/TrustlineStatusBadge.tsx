"use client";

import { Badge } from "@/components/ui/badge";
import type { ReadinessStatus } from "@/types";

const STATUS_CONFIG: Record<
  ReadinessStatus,
  { label: string; variant: "ready" | "warning" | "danger"; icon: string }
> = {
  ready: { label: "Ready", variant: "ready", icon: "✅" },
  low_reserve: { label: "Low Reserve", variant: "warning", icon: "⚠️" },
  not_ready: { label: "Not Ready", variant: "danger", icon: "❌" },
};

interface TrustlineStatusBadgeProps {
  status: ReadinessStatus;
  className?: string;
}

export function TrustlineStatusBadge({
  status,
  className,
}: TrustlineStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={className}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
}
