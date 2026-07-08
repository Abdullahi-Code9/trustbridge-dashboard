"use client";

import { Badge } from "@/components/ui/badge";
import { getReadinessConfig } from "@/lib/readiness";
import type { ReadinessStatus } from "@/types";

interface TrustlineStatusBadgeProps {
  status: ReadinessStatus;
  className?: string;
  showDescription?: boolean;
}

export function TrustlineStatusBadge({
  status,
  className,
  showDescription = false,
}: TrustlineStatusBadgeProps) {
  const config = getReadinessConfig(status);

  return (
    <Badge
      variant={config.variant}
      className={className}
      title={showDescription ? config.description : undefined}
    >
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
}
