import { NextResponse } from "next/server";

import type { HorizonCheckResult, ReadinessStatus } from "@/types";

export function emptyCheckResult(
  readiness: ReadinessStatus = "not_ready",
  errors: string[] = [],
): HorizonCheckResult {
  return {
    funded: false,
    trustline: false,
    xlm_balance: "0",
    errors,
    readiness,
  };
}

export function jsonCheckError(
  errors: string[],
  status: number,
  readiness: ReadinessStatus = "not_ready",
) {
  return NextResponse.json(emptyCheckResult(readiness, errors), { status });
}

export function jsonCheckResult(result: HorizonCheckResult, status = 200) {
  return NextResponse.json(result, { status });
}
