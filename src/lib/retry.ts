/**
 * Small, dependency-free retry helper.
 *
 * Pure and isomorphic (no `server-only`, no stellar-sdk) so it can be unit
 * tested and reused by any module that talks to a flaky upstream such as the
 * Stellar Horizon API.
 */

export interface RetryOptions {
  /** Total number of attempts (including the first). Defaults to 3. */
  attempts?: number;
  /** Base delay between attempts, in milliseconds. Defaults to 250ms. */
  delayMs?: number;
  /** Multiply the delay after each failed attempt (exponential backoff). Defaults to 2. */
  backoffFactor?: number;
  /**
   * Decide whether a thrown error is worth retrying. Return `false` to fail
   * fast (e.g. a 404 that will never succeed). Defaults to retrying everything.
   */
  shouldRetry?: (error: unknown) => boolean;
  /** Sleep implementation, injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn`, retrying on failure with exponential backoff.
 * Throws the last error once all attempts are exhausted.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    attempts = 3,
    delayMs = 250,
    backoffFactor = 2,
    shouldRetry = () => true,
    sleep = defaultSleep,
  } = options;

  const totalAttempts = Math.max(1, Math.floor(attempts));
  let lastError: unknown;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === totalAttempts;
      if (isLastAttempt || !shouldRetry(error)) {
        throw error;
      }

      const wait = delayMs * Math.pow(backoffFactor, attempt - 1);
      if (wait > 0) await sleep(wait);
    }
  }

  // Unreachable in practice — the loop either returns or throws.
  throw lastError;
}
