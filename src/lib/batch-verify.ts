/**
 * Batch verification utilities for dashboard.
 * Enables efficient bulk verification of contributor readiness.
 */

export interface VerificationCheckResult {
  username: string;
  stellar_address: string;
  status: 'ready' | 'low_reserve' | 'not_ready' | 'error';
  error_message?: string;
  checks: {
    funded: boolean;
    trustline: boolean;
    reserve: boolean;
  };
  xlm_balance?: string;
  last_checked?: Date;
}

export interface BatchVerificationOptions {
  /**
   * Maximum concurrent verification requests
   */
  concurrency?: number;
  /**
   * Timeout per verification in milliseconds
   */
  timeout?: number;
  /**
   * Whether to skip already verified accounts
   */
  skipVerified?: boolean;
  /**
   * Minimum XLM reserve requirement
   */
  minXlmReserve?: number;
}

/**
 * Execute multiple verification checks with concurrency control.
 */
export async function batchVerify(
  verifications: Array<{
    username: string;
    stellar_address: string;
  }>,
  verifyFn: (address: string) => Promise<VerificationCheckResult>,
  options: BatchVerificationOptions = {},
): Promise<VerificationCheckResult[]> {
  const { concurrency = 5, timeout = 10_000 } = options;

  const results: VerificationCheckResult[] = [];
  const queue = [...verifications];

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      try {
        const timeoutPromise = new Promise<VerificationCheckResult>((_, reject) =>
          setTimeout(() => reject(new Error('Verification timeout')), timeout),
        );

        const result = await Promise.race([
          verifyFn(item.stellar_address),
          timeoutPromise,
        ]);

        results.push(result);
      } catch (error) {
        results.push({
          username: item.username,
          stellar_address: item.stellar_address,
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          checks: {
            funded: false,
            trustline: false,
            reserve: false,
          },
        });
      }
    }
  };

  // Run workers concurrently
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return results;
}

/**
 * Calculate summary statistics for batch verification results.
 */
export function calculateVerificationSummary(results: VerificationCheckResult[]) {
  const total = results.length;
  const ready = results.filter((r) => r.status === 'ready').length;
  const lowReserve = results.filter((r) => r.status === 'low_reserve').length;
  const notReady = results.filter((r) => r.status === 'not_ready').length;
  const errors = results.filter((r) => r.status === 'error').length;

  return {
    total,
    ready,
    lowReserve,
    notReady,
    errors,
    readyPercentage: total > 0 ? Math.round((ready / total) * 100) : 0,
    succeededPercentage: total > 0 ? Math.round(((total - errors) / total) * 100) : 0,
  };
}

/**
 * Filter verification results by status.
 */
export function filterByStatus(
  results: VerificationCheckResult[],
  status: VerificationCheckResult['status'],
): VerificationCheckResult[] {
  return results.filter((r) => r.status === status);
}

/**
 * Sort verification results by readiness.
 */
export function sortByReadiness(
  results: VerificationCheckResult[],
): VerificationCheckResult[] {
  const order: Record<VerificationCheckResult['status'], number> = {
    ready: 0,
    low_reserve: 1,
    not_ready: 2,
    error: 3,
  };

  return [...results].sort((a, b) => order[a.status] - order[b.status]);
}

/**
 * Export verification results as CSV-compatible array of objects.
 */
export function exportAsCSV(
  results: VerificationCheckResult[],
): Array<Record<string, unknown>> {
  return results.map((r) => ({
    username: r.username,
    stellar_address: r.stellar_address,
    status: r.status,
    funded: r.checks.funded,
    trustline: r.checks.trustline,
    reserve: r.checks.reserve,
    xlm_balance: r.xlm_balance || 'N/A',
    last_checked: r.last_checked?.toISOString() || 'N/A',
    error: r.error_message || '',
  }));
}
