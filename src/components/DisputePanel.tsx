"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContributorRow } from "@/types";

interface DisputePanelProps {
  contributors: ContributorRow[];
}

interface Dispute {
  id: string;
  registrationId: string;
  reason: string;
  proofCid: string | null;
  status: "OPEN" | "VALIDATED" | "REJECTED";
  createdAt: string;
}

export function DisputePanel({ contributors }: DisputePanelProps) {
  const queryClient = useQueryClient();
  const [registrationId, setRegistrationId] = useState(contributors[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [proofCid, setProofCid] = useState("");
  const disputesQuery = useQuery({
    queryKey: ["disputes"],
    queryFn: async () => {
      const response = await fetch("/api/disputes");
      if (!response.ok) throw new Error("Failed to load disputes");
      return (await response.json()) as { disputes: Dispute[] };
    },
  });
  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, reason, proofCid: proofCid || undefined }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to file dispute");
    },
    onSuccess: () => {
      setReason("");
      setProofCid("");
      void queryClient.invalidateQueries({ queryKey: ["disputes"] });
    },
  });

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Registration disputes</CardTitle>
        <CardDescription>File and review payout-address disputes. IPFS proof is optional.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="grid gap-3 md:grid-cols-[1fr_2fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={registrationId} onChange={(event) => setRegistrationId(event.target.value)} aria-label="Registration">
            {contributors.map((contributor) => <option key={contributor.id} value={contributor.id}>{contributor.githubUsername}</option>)}
          </select>
          <input className="h-10 rounded-md border bg-background px-3 text-sm" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for dispute" required maxLength={2000} aria-label="Dispute reason" />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" value={proofCid} onChange={(event) => setProofCid(event.target.value)} placeholder="IPFS CID (optional)" maxLength={200} aria-label="IPFS proof CID" />
          <Button type="submit" disabled={!registrationId || createMutation.isPending}>{createMutation.isPending ? "Filing..." : "File dispute"}</Button>
        </form>
        {createMutation.isError && <p className="text-sm text-destructive">{createMutation.error.message}</p>}
        <ul className="space-y-2 text-sm" aria-live="polite">
          {(disputesQuery.data?.disputes ?? []).map((dispute) => <li key={dispute.id} className="rounded-md border px-3 py-2"><span className="font-medium">{dispute.status}</span> <span className="text-muted-foreground">for {dispute.registrationId}</span><p>{dispute.reason}</p></li>)}
        </ul>
      </CardContent>
    </Card>
  );
}