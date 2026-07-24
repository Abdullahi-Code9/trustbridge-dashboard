import "server-only";

import { DEFAULT_HORIZON_URL } from "@/lib/constants";
import type { NetworkConfig, StellarNetwork } from "@/types";

const DEFAULT_SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

/**
 * Resolve the Horizon URL exactly as `getHorizonServer()` does in
 * `src/lib/horizon.ts` — kept in sync deliberately rather than imported,
 * since `horizon.ts` is a `server-only` module built around the SDK client
 * and importing it here would pull in `stellar-sdk` for a pure classifier.
 */
export function resolveHorizonUrl(): string {
  return process.env.NEXT_PUBLIC_HORIZON_URL?.trim() || DEFAULT_HORIZON_URL;
}

/** Mirrors `getSorobanRpcUrl()` in `src/lib/soroban.ts`. */
export function resolveSorobanRpcUrl(): string {
  return process.env.SOROBAN_RPC_URL?.trim() || DEFAULT_SOROBAN_RPC_URL;
}

/** Classify a Horizon URL by hostname. Unknown hosts are "custom". */
export function classifyHorizonNetwork(url: string): StellarNetwork {
  const hostname = safeHostname(url);
  if (hostname === "horizon.stellar.org") return "mainnet";
  if (hostname === "horizon-testnet.stellar.org") return "testnet";
  return "custom";
}

/**
 * Classify a Soroban RPC URL by hostname. There is no single canonical
 * public mainnet Soroban RPC hostname the way there is for Horizon — most
 * mainnet deployments use a provider-specific endpoint (e.g. a paid RPC
 * service) rather than one blessed by the Stellar Development Foundation.
 * `soroban-testnet.stellar.org` is the one hostname worth hardcoding with
 * confidence; `mainnet.sorobanrpc.com` is documented in this project's own
 * docs/ENVIRONMENT.md as the mainnet example, so it is special-cased too.
 * Anything else is treated as "custom" rather than guessed at, so a
 * self-hosted or private RPC node never false-positives as a network
 * mismatch.
 */
export function classifySorobanNetwork(url: string): StellarNetwork {
  const hostname = safeHostname(url);
  if (hostname === "soroban-testnet.stellar.org") return "testnet";
  if (hostname === "mainnet.sorobanrpc.com") return "mainnet";
  return "custom";
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Reads the resolved Horizon and Soroban RPC endpoints and flags a
 * mismatch when they point at two different *known* named networks (e.g.
 * Horizon mainnet + Soroban testnet — the project's actual default
 * configuration). Custom endpoints on either side are never flagged, since
 * a private/self-hosted RPC node is a legitimate setup this check cannot
 * confidently classify.
 */
export function getNetworkConfig(): NetworkConfig {
  const horizonUrl = resolveHorizonUrl();
  const sorobanUrl = resolveSorobanRpcUrl();
  const horizonNetwork = classifyHorizonNetwork(horizonUrl);
  const sorobanNetwork = classifySorobanNetwork(sorobanUrl);
  const sorobanContractConfigured = Boolean(
    process.env.SOROBAN_CONTRACT_ID?.trim()
  );

  const mismatched =
    horizonNetwork !== "custom" &&
    sorobanNetwork !== "custom" &&
    horizonNetwork !== sorobanNetwork;

  const warnings: string[] = [];
  if (mismatched) {
    warnings.push(
      `Horizon is configured for ${horizonNetwork} (${horizonUrl}) but Soroban RPC is configured for ${sorobanNetwork} (${sorobanUrl}). Contributor funding and Soroban events are being read from different networks.`
    );
  }
  if (!sorobanContractConfigured) {
    warnings.push(
      "SOROBAN_CONTRACT_ID is not configured — the Soroban event timeline is disabled."
    );
  }

  return {
    horizonUrl,
    horizonNetwork,
    sorobanUrl,
    sorobanNetwork,
    sorobanContractConfigured,
    mismatched,
    warnings,
  };
}
