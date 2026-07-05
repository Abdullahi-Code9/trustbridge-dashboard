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

export const MIN_XLM_BALANCE = Number(
  process.env.NEXT_PUBLIC_MIN_XLM_BALANCE ?? "1"
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
