"use client";

import { useMemo, useState } from "react";
import { Download, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ContributorRow, ReadinessStatus } from "@/types";

interface WavePrepWorkspaceProps {
  contributors: ContributorRow[];
  waveNumber?: number;
  onExportCsv?: () => void;
  onExportJson?: () => void;
  isExporting?: boolean;
}

export function WavePrepWorkspace({
  contributors,
  waveNumber,
  onExportCsv,
  onExportJson,
  isExporting = false,
}: WavePrepWorkspaceProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<
    Set<ReadinessStatus>
  >(new Set(["ready", "low_reserve", "not_ready"]));

  const stats = useMemo(() => {
    return {
      total: contributors.length,
      ready: contributors.filter((c) => c.readiness === "ready").length,
      lowReserve: contributors.filter(
        (c) => c.readiness === "low_reserve"
      ).length,
      notReady: contributors.filter((c) => c.readiness === "not_ready").length,
      verified: contributors.filter((c) => c.verified).length,
      funded: contributors.filter((c) => c.funded).length,
    };
  }, [contributors]);

  const filteredContributors = useMemo(() => {
    return contributors.filter((c) => selectedStatuses.has(c.readiness));
  }, [contributors, selectedStatuses]);

  const toggleStatus = (status: ReadinessStatus) => {
    const newStatuses = new Set(selectedStatuses);
    if (newStatuses.has(status)) {
      newStatuses.delete(status);
    } else {
      newStatuses.add(status);
    }
    setSelectedStatuses(newStatuses);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {waveNumber ? `Wave ${waveNumber}` : "Wave"} Prep Workspace
          </CardTitle>
          <CardDescription>
            Prepare contributors for the upcoming Wave payout. Filter by
            readiness status and bulk export for Wave operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
              <div className="text-sm font-medium text-muted-foreground">
                Total Contributors
              </div>
              <div className="mt-2 text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950">
              <div className="text-sm font-medium text-muted-foreground">
                Ready
              </div>
              <div className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.ready}
              </div>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950">
              <div className="text-sm font-medium text-muted-foreground">
                Low Reserve
              </div>
              <div className="mt-2 text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.lowReserve}
              </div>
            </div>
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950">
              <div className="text-sm font-medium text-muted-foreground">
                Not Ready
              </div>
              <div className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.notReady}
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
              <div className="text-sm font-medium text-muted-foreground">
                Verified
              </div>
              <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.verified}
              </div>
            </div>
            <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950">
              <div className="text-sm font-medium text-muted-foreground">
                Funded
              </div>
              <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.funded}
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Filter by readiness</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={
                  selectedStatuses.has("ready") ? "default" : "outline"
                }
                size="sm"
                onClick={() => toggleStatus("ready")}
              >
                Ready ({stats.ready})
              </Button>
              <Button
                variant={
                  selectedStatuses.has("low_reserve") ? "default" : "outline"
                }
                size="sm"
                onClick={() => toggleStatus("low_reserve")}
              >
                Low Reserve ({stats.lowReserve})
              </Button>
              <Button
                variant={
                  selectedStatuses.has("not_ready") ? "default" : "outline"
                }
                size="sm"
                onClick={() => toggleStatus("not_ready")}
              >
                Not Ready ({stats.notReady})
              </Button>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="mb-4 flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Export</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onExportCsv}
                disabled={isExporting || contributors.length === 0}
              >
                Export CSV ({filteredContributors.length})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onExportJson}
                disabled={isExporting || contributors.length === 0}
              >
                Export JSON ({filteredContributors.length})
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
            <p className="text-sm text-muted-foreground">
              <strong>Filtered:</strong> {filteredContributors.length} of{" "}
              {contributors.length} contributors match the selected criteria.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
