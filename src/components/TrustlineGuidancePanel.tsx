import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LOBSTR_TRUSTLINE_URL,
  STELLAR_LAB_TRUSTLINE_URL,
} from "@/lib/constants";

export function TrustlineGuidancePanel() {
  return (
    <Card className="border-stellar-cyan/20 bg-gradient-to-br from-stellar-purple/5 to-stellar-cyan/5">
      <CardHeader>
        <CardTitle className="text-lg">Set up your USDC trustline</CardTitle>
        <CardDescription>
          TrustBridge Wave payouts use USDC on Stellar. Follow these steps before
          submitting your address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            Fund your Stellar account with at least 1 XLM (creates the account
            on-network).
          </li>
          <li>
            Add a USDC trustline using{" "}
            <a
              href={LOBSTR_TRUSTLINE_URL}
              target="_blank" rel="noreferrer"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-stellar-cyan hover:underline"
            >
              Lobstr <ExternalLink className="h-3 w-3" />
            </a>{" "}
            or the{" "}
            <a
              href={STELLAR_LAB_TRUSTLINE_URL}
              target="_blank" rel="noreferrer"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-stellar-cyan hover:underline"
            >
              Stellar Laboratory <ExternalLink className="h-3 w-3" />
            </a>
            .
          </li>
          <li>Paste your public G-address below — we validate live via Horizon.</li>
          <li>Submit once the readiness badge shows ✅ Ready.</li>
        </ol>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline" size="sm">
            <Link href={LOBSTR_TRUSTLINE_URL} target="_blank" rel="noreferrer">
              Open Lobstr
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={STELLAR_LAB_TRUSTLINE_URL} target="_blank" rel="noreferrer">
              Stellar Lab
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
