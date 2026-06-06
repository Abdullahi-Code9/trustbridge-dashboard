export const STELLAR_COLORS = {
  purple: "#3E1BDB",
  cyan: "#00B4D8",
} as const;

export const DEFAULT_HORIZON_URL = "https://horizon.stellar.org";

export const DEFAULT_ASSET = {
  code: process.env.NEXT_PUBLIC_DEFAULT_ASSET_CODE ?? "USDC",
  issuer:
    process.env.NEXT_PUBLIC_DEFAULT_ASSET_ISSUER ??
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX5IHOWEBMGJI55ITFSZ6",
};

export const MIN_XLM_BALANCE = Number(
  process.env.NEXT_PUBLIC_MIN_XLM_BALANCE ?? "1"
);

export const LOBSTR_TRUSTLINE_URL =
  "https://lobstr.co/trustlines/create?asset_code=USDC&asset_issuer=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX5IHOWEBMGJI55ITFSZ6";

export const STELLAR_LAB_TRUSTLINE_URL =
  "https://laboratory.stellar.org/#txbuilder?params=%7B%22operations%22%3A%5B%7B%22source%22%3A%22%22%2C%22type%22%3A%22changeTrust%22%2C%22asset%22%3A%7B%22code%22%3A%22USDC%22%2C%22issuer%22%3A%22GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX5IHOWEBMGJI55ITFSZ6%22%7D%7D%5D%7D";
