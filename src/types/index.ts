export type ReadinessStatus = "ready" | "low_reserve" | "not_ready";

export interface HorizonCheckResult {
  funded: boolean;
  trustline: boolean;
  /**
   * Whether the matching trustline is authorized by the asset issuer.
   * A present-but-unauthorized trustline still fails payments, so this is
   * tracked separately from `trustline` (mere presence).
   */
  trustline_authorized: boolean;
  /**
   * On-chain verified: funded, trustline present, and authorized.
   * Convenience flag derived from the checks above.
   */
  verified: boolean;
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
  trustlineAuthorized: boolean;
  verified: boolean;
  funded: boolean;
  xlmBalance: string;
  lastCheckedAt: string | null;
  readiness: ReadinessStatus;
}

export type AuditAction =
  | "recheck.single"
  | "recheck.batch"
  | "registration.create"
  | "registration.update";

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorLogin: string | null;
  action: AuditAction | string;
  targetId: string | null;
  targetLabel: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardStats {
  totalContributors: number;
  readyCount: number;
  readyPercent: number;
}

export type SorobanEventType = "contract" | "system" | "diagnostic";

export interface SorobanEventRow {
  id: string;
  type: SorobanEventType;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  topic: string[];
  value: string;
  txHash: string;
}

export interface SorobanEventTimelineResponse {
  events: SorobanEventRow[];
  latestLedger: number;
  errors: string[];
}
