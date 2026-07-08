import type { ReadinessStatus } from "@/types";

export interface ReadinessDisplayConfig {
  label: string;
  variant: "ready" | "warning" | "danger";
  icon: string;
  description: string;
}

export const READINESS_CONFIG: Record<ReadinessStatus, ReadinessDisplayConfig> = {
  ready: {
    label: "Ready",
    variant: "ready",
    icon: "✅",
    description: "Funded, trustline present, and reserve met",
  },
  low_reserve: {
    label: "Low Reserve",
    variant: "warning",
    icon: "⚠️",
    description: "Trustline ready but XLM reserve is below the minimum",
  },
  not_ready: {
    label: "Not Ready",
    variant: "danger",
    icon: "❌",
    description: "Missing funding and/or required trustline",
  },
};

export function getReadinessConfig(status: ReadinessStatus): ReadinessDisplayConfig {
  return READINESS_CONFIG[status];
}

export function getRowAccent(status: ReadinessStatus): string {
  switch (status) {
    case "ready":
      return "border-l-4 border-l-emerald-500";
    case "low_reserve":
      return "border-l-4 border-l-amber-500";
    case "not_ready":
      return "border-l-4 border-l-red-500";
  }
}

export function describeReadiness(status: ReadinessStatus): string {
  return getReadinessConfig(status).description;
}
