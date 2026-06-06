export type ReadinessStatus = "ready" | "low_reserve" | "not_ready";

export interface HorizonCheckResult {
  funded: boolean;
  trustline: boolean;
  xlm_balance: string;
  errors: string[];
  readiness: ReadinessStatus;
}

export interface CheckAddressPayload {
  address: string;
  asset_code?: string;
  asset_issuer?: string;
}

export interface ContributorRow {
  id: string;
  githubUsername: string;
  stellarAddress: string;
  trustlineReady: boolean;
  funded: boolean;
  xlmBalance: string;
  lastCheckedAt: string | null;
  readiness: ReadinessStatus;
}

export interface DashboardStats {
  totalContributors: number;
  readyCount: number;
  readyPercent: number;
}
