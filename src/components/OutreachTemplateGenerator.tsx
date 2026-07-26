"use client";

import { useState } from "react";
import { Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generateTemplate,
  type TemplateFormat,
  type TemplateOptions,
} from "@/lib/outreach-templates";

interface OutreachTemplateGeneratorProps {
  waveNumber?: number;
  supportEmail?: string;
  assetCode?: string;
  assetIssuer?: string;
}

export function OutreachTemplateGenerator({
  waveNumber = 1,
  supportEmail = "support@trustbridge.dev",
  assetCode = "USDC",
  assetIssuer = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX5IHOWEBMGJI55ITFSZ6",
}: OutreachTemplateGeneratorProps) {
  const [format, setFormat] = useState<TemplateFormat>("email");
  const [contributorName, setContributorName] = useState("");
  const [minXlmBalance, setMinXlmBalance] = useState("1");
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [template, setTemplate] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const options: TemplateOptions = {
      contributorName: contributorName || "Contributor",
      waveNumber,
      deadline: new Date(deadline),
      minXlmBalance: parseFloat(minXlmBalance) || 1,
      supportEmail,
      assetCode,
      assetIssuer,
    };

    const generated = generateTemplate(format, options);
    setTemplate(generated);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(template).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const extension = format === "email" ? "txt" : format === "markdown" ? "md" : "txt";
    const filename = `wave-${waveNumber}-outreach-template.${extension}`;
    const blob = new Blob([template], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Outreach Template Generator</CardTitle>
          <CardDescription>
            Generate outreach templates for Wave {waveNumber} contributors with
            wallet setup instructions and proof guidelines.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="format">Template Format</Label>
              <select
                id="format"
                value={format}
                onChange={(e) => setFormat(e.target.value as TemplateFormat)}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="email">Email</option>
                <option value="markdown">Markdown</option>
                <option value="plain">Plain Text</option>
              </select>
            </div>

            <div>
              <Label htmlFor="contributor-name">Contributor Name (optional)</Label>
              <Input
                id="contributor-name"
                type="text"
                placeholder="e.g., Alice"
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="min-xlm">Minimum XLM Balance</Label>
              <Input
                id="min-xlm"
                type="number"
                min="0.1"
                step="0.1"
                value={minXlmBalance}
                onChange={(e) => setMinXlmBalance(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="deadline">Deadline Date</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <Button onClick={handleGenerate} className="w-full md:w-auto">
            Generate Template
          </Button>

          {template && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-900">
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-sm">
                  {template}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  className="flex-1"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownload}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
