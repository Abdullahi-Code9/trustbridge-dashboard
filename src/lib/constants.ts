export const STELLAR_COLORS = {
  purple: "#3E1BDB",
  cyan: "#00B4D8",
} as const;

export const DEFAULT_HORIZON_URL = "https://horizon.stellar.org";

export const DEFAULT_ASSET = {
  code: (process.env.NEXT_PUBLIC_DEFAULT_ASSET_CODE ?? "USDC").trim().toUpperCase(),
  issuer: (process.env.NEXT_PUBLIC_DEFAULT_ASSET_ISSUER ??
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX5IHOWEBMGJI55ITFSZ6").trim(),
};

function parseMinXlmBalance(value: string | undefined): number {
  const parsed = Number(value ?? "1");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
}

export const MIN_XLM_BALANCE = parseMinXlmBalance(
  process.env.NEXT_PUBLIC_MIN_XLM_BALANCE
);

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
