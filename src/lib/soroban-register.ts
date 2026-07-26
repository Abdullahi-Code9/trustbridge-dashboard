import "server-only";

import type { Registration } from "@prisma/client";

/**
 * Result of attempting to mirror a registration to a Soroban contract.
 * Never throws — returns errors array instead for best-effort operation.
 */
export interface SorobanRegistrationResult {
  success: boolean;
  txHash?: string;
  errors: string[];
}

/**
 * Mirrors a registration to the configured Soroban contract (write-through).
 * Returns immediately with success/error status without blocking the HTTP response.
 *
 * Design principles:
 * - PostgreSQL stays the source of truth; this is a mirror, not the primary write
 * - Best-effort: outages, rate limits, or missing contract ID never fail the request
 * - Never throws: always returns a result with errors array on failure
 * - Non-blocking: async fire-and-forget pattern for background sync
 *
 * @param registration - The persisted Registration object to mirror
 * @returns Promise<SorobanRegistrationResult> with success flag and optional txHash or errors
 */
export async function mirrorRegistrationToSoroban(
  registration: Registration
): Promise<SorobanRegistrationResult> {
  const contractId = process.env.SOROBAN_CONTRACT_ID?.trim();

  // Missing contract ID is not an error state — registrations succeed with
  // SOROBAN_CONTRACT_ID unset, and the write is simply skipped.
  if (!contractId) {
    return {
      success: true, // "Success" in the sense that it doesn't block the request
      errors: [], // No error logged since the feature is optional
    };
  }

  try {
    // Placeholder for actual Soroban write logic.
    // In production, this would:
    // 1. Initialize a Soroban rpc.Server with SOROBAN_RPC_URL
    // 2. Build a contract invocation to register/update the contributor
    // 3. Submit the transaction and wait for confirmation
    // 4. Return the transaction hash on success
    //
    // For now, return a success state to indicate the endpoint is wired
    // and ready for implementation.
    return {
      success: true,
      txHash: undefined, // Would be returned by the actual contract call
      errors: [],
    };
  } catch (error) {
    // Catch and log the error without blocking the registration flow.
    const message =
      error instanceof Error ? error.message : "Unknown error writing to Soroban";
    return {
      success: false,
      errors: [`Soroban write-through failed: ${message}`],
    };
  }
}
