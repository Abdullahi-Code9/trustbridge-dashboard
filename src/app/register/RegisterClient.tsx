"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { AddressInput } from "@/components/AddressInput";
import { OutreachTemplateGenerator } from "@/components/OutreachTemplateGenerator";
import { TrustlineGuidancePanel } from "@/components/TrustlineGuidancePanel";
import { TrustlineStatusBadge } from "@/components/TrustlineStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RegistrationResponse {
  registration?: {
    stellarAddress: string;
    readiness: "ready" | "low_reserve" | "not_ready";
  };
}

export function RegisterClient() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);

  const maintainerError = searchParams.get("error") === "maintainer";

  const existingQuery = useQuery({
    queryKey: ["registration"],
    queryFn: async () => {
      const response = await fetch("/api/register");
      if (!response.ok) throw new Error("Failed to load registration");
      return (await response.json()) as RegistrationResponse;
    },
    enabled: !!session,
  });

  const saveMutation = useMutation({
    mutationFn: async (stellarAddress: string) => {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stellarAddress }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Registration failed");
      }
      return data;
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["registration"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const existingAddress =
    existingQuery.data?.registration?.stellarAddress ?? "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {maintainerError && (
        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-200">
          Maintainer dashboard requires membership in the configured GitHub
          organization. You can still register your Stellar address here.
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Contributor registration</h1>
        <p className="mt-2 text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            @{session?.user?.githubUsername}
          </span>
          . Link your GitHub identity to a Stellar G-address for Wave payouts.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          {existingAddress && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Current registration
                </CardTitle>
                <CardDescription className="font-mono text-xs break-all">
                  {existingAddress}
                </CardDescription>
              </CardHeader>
              {existingQuery.data?.registration?.readiness && (
                <CardContent>
                  <TrustlineStatusBadge
                    status={existingQuery.data.registration.readiness}
                  />
                </CardContent>
              )}
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                {existingAddress ? "Update Stellar address" : "Stellar address"}
              </CardTitle>
              <CardDescription>
                Enter your public key (starts with G). Validation runs as you
                type via Horizon.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddressInput
                value={address}
                onChange={setAddress}
                disabled={saveMutation.isPending}
              />

              {saveMutation.isError && (
                <p className="text-sm text-destructive">
                  {(saveMutation.error as Error).message}
                </p>
              )}

              {saved && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Registration saved successfully.
                </p>
              )}

              <Button
                variant="stellar"
                disabled={!address.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate(address.trim())}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save registration"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <TrustlineGuidancePanel />
        </div>
      </div>

      <div className="mt-12 border-t pt-8">
        <OutreachTemplateGenerator />
      </div>
    </div>
  );
}
