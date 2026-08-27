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

/**
 * Contributor-facing setup guide.
 *
 * Written for a GitHub contributor who has never used Stellar: every term that
 * only makes sense inside Stellar ("trustline", "reserve", "G-address") is
 * introduced with what it actually does. Field-level Horizon detail stays in
 * the maintainer "Horizon debug" panel — see `docs/READINESS_MODEL.md`.
 */
export function TrustlineGuidancePanel() {
  return (
    <Card
      className="border-stellar-cyan/20 bg-gradient-to-br from-stellar-purple/5 to-stellar-cyan/5"
      data-testid="trustline-guidance"
    >
      <CardHeader>
        <CardTitle className="text-lg">
          New to Stellar? Set your wallet up first
        </CardTitle>
        <CardDescription>
          Payouts are sent as USDC on the Stellar network. A Stellar wallet has
          to be switched on for USDC before it can receive any — these four
          steps do that. It usually takes about ten minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            <span className="font-medium">Put some XLM in your wallet.</span>{" "}
            XLM is Stellar&apos;s own coin. A wallet does not really exist until
            it holds a little of it, so send at least 1 XLM to your address
            before anything else.
          </li>
          <li>
            <span className="font-medium">Turn on USDC for that wallet.</span>{" "}
            Stellar wallets opt in to each kind of token one at a time — the
            official name for that opt-in is a{" "}
            <em>trustline</em>. You can do it in{" "}
            <a
              href={LOBSTR_TRUSTLINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-stellar-cyan hover:underline"
            >
              Lobstr <ExternalLink className="h-3 w-3" />
            </a>{" "}
            (a wallet app, easiest) or the{" "}
            <a
              href={STELLAR_LAB_TRUSTLINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-stellar-cyan hover:underline"
            >
              Stellar Laboratory <ExternalLink className="h-3 w-3" />
            </a>{" "}
            (a developer tool).
          </li>
          <li>
            <span className="font-medium">
              Paste your public address below.
            </span>{" "}
            That is the one starting with a capital <code>G</code> — it is safe
            to share, unlike your secret key, which starts with{" "}
            <code>S</code> and should never be pasted anywhere. We check the
            wallet as you type and tell you what is still missing.
          </li>
          <li>
            <span className="font-medium">
              Copy the ownership proof if asked.
            </span>{" "}
            The panel above shows a short piece of text. If a maintainer asks
            you to prove the wallet is yours, sign that text in your wallet and
            send it back.
          </li>
        </ol>

        <p className="text-muted-foreground">
          Save your address as soon as it is entered — you do not have to wait
          for the badge to turn green. Re-run the check any time after you
          finish the setup.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline" size="sm">
            <Link href={LOBSTR_TRUSTLINE_URL} target="_blank" rel="noreferrer">
              Turn on USDC in Lobstr
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={STELLAR_LAB_TRUSTLINE_URL} target="_blank" rel="noreferrer">
              Use Stellar Laboratory
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
