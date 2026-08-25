export const STELLAR_COLORS = {
  purple: "#3E1BDB",
  cyan: "#00B4D8",
} as const;

/**
 * Defaults declared by `action.yml` in Stellar-TrustBridge/trustbridge-action.
 *
 * The dashboard and the Action must agree on these three values or a
 * contributor can read as "ready" here and still fail the Action (or the
 * reverse) — the dashboard would be checking a different asset, a different
 * network, or a lower reserve floor than the workflow that gates their payout.
 *
 * Treat this block as a mirror, not a source of truth: when the Action changes
 * a default, update it here in the same wave and keep `docs/ENVIRONMENT.md`
 * in step. `checkActionAlignment()` in `src/lib/network-config.ts` compares
 * the *resolved* environment against these values and surfaces any drift on
 * the dashboard's network panel.
 *
 * @see https://github.com/Stellar-TrustBridge/trustbridge-action/blob/main/action.yml
 */
export const ACTION_DEFAULTS = {
  /** action.yml input: `horizon_url` */
  horizonUrl: "https://horizon.stellar.org",
  /** action.yml input: `asset_code` */
  assetCode: "USDC",
  /**
   * action.yml input: `asset_issuer` — Circle's USDC issuer on Stellar
   * **mainnet** (public network). This is a real, checksum-valid G-address;
   * verify any replacement with `StrKey.isValidEd25519PublicKey` before
   * committing it.
   */
  assetIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  /** action.yml input: `min_xlm_reserve` */
  minXlmReserve: 1.5,
} as const;

export const DEFAULT_HORIZON_URL = ACTION_DEFAULTS.horizonUrl;

/**
 * Read the configured asset code, falling back to the Action's default.
 *
 * Exported as a function (rather than only the frozen `DEFAULT_ASSET` const
 * below) so that `checkActionAlignment()` — and tests that stub the
 * environment — can resolve the value at call time. `DEFAULT_ASSET` captures
 * it once at module load, which is what the request path wants but is
 * unobservable to a test that sets `process.env` after import.
 */
export function resolveAssetCode(): string {
  return (
    process.env.NEXT_PUBLIC_DEFAULT_ASSET_CODE ?? ACTION_DEFAULTS.assetCode
  )
    .trim()
    .toUpperCase();
}

/** Read the configured asset issuer at call time. @see resolveAssetCode */
export function resolveAssetIssuer(): string {
  return (
    process.env.NEXT_PUBLIC_DEFAULT_ASSET_ISSUER ?? ACTION_DEFAULTS.assetIssuer
  ).trim();
}

export const DEFAULT_ASSET = {
  code: resolveAssetCode(),
  issuer: resolveAssetIssuer(),
};

function parseMinXlmBalance(value: string | undefined): number {
  const parsed = Number(value ?? String(ACTION_DEFAULTS.minXlmReserve));
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : ACTION_DEFAULTS.minXlmReserve;
}

/** Read the minimum spendable-XLM floor at call time. @see resolveAssetCode */
export function resolveMinXlmBalance(): number {
  return parseMinXlmBalance(process.env.NEXT_PUBLIC_MIN_XLM_BALANCE);
}

export const MIN_XLM_BALANCE = resolveMinXlmBalance();

function parseBaseReserveXlm(value: string | undefined): number {
  const parsed = Number(value ?? "0.5");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0.5;
}

/** Stellar network base reserve, in XLM, per subentry/sponsorship unit. */
export const BASE_RESERVE_XLM = parseBaseReserveXlm(
  process.env.NEXT_PUBLIC_BASE_RESERVE_XLM
);

export function buildLobstrTrustlineUrl(asset = DEFAULT_ASSET): string {
  const params = new URLSearchParams({
    asset_code: asset.code,
    asset_issuer: asset.issuer,
  });
  return `https://lobstr.co/trustlines/create?${params.toString()}`;
}

export function buildStellarLabTrustlineUrl(asset = DEFAULT_ASSET): string {
  const params = new URLSearchParams({
    params: JSON.stringify({
      operations: [
        {
          source: "",
          type: "changeTrust",
          asset: {
            code: asset.code,
            issuer: asset.issuer,
          },
        },
      ],
    }),
  });
  return `https://laboratory.stellar.org/#txbuilder?${params.toString()}`;
}

export const LOBSTR_TRUSTLINE_URL = buildLobstrTrustlineUrl();

export const STELLAR_LAB_TRUSTLINE_URL = buildStellarLabTrustlineUrl();
