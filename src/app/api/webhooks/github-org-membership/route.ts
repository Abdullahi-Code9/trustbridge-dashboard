import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verifies the GitHub webhook signature to ensure the request is authentic.
 * GitHub sends X-Hub-Signature-256 with each webhook.
 */
function verifyWebhookSignature(
  payload: Buffer,
  signature: string | undefined
): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn(
      "GITHUB_WEBHOOK_SECRET not configured — webhook signature verification skipped"
    );
    return false;
  }

  if (!signature) {
    console.warn("Missing X-Hub-Signature-256 header");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const digest = `sha256=${hmac.digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature)
  );
}

interface GitHubMembershipEvent {
  action: "added" | "deleted";
  member: {
    login: string;
    id: number;
  };
  organization: {
    login: string;
  };
  sender: {
    login: string;
  };
}

/**
 * GitHub organization membership webhook handler.
 * Syncs org membership changes to update maintainer access.
 *
 * Expects: member added/deleted events
 * Returns: 202 Accepted (async processing)
 * Logs: audit trail + health metrics
 */
export async function POST(request: NextRequest) {
  try {
    // Collect raw body for signature verification
    const body = await request.arrayBuffer();
    const payload = Buffer.from(body);

    // Verify webhook signature
    const signature = request.headers.get("X-Hub-Signature-256") || undefined;
    if (!verifyWebhookSignature(payload, signature)) {
      console.warn("Webhook signature verification failed");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Parse JSON
    const event: GitHubMembershipEvent = JSON.parse(
      payload.toString("utf-8")
    );

    const { action, member, organization, sender } = event;
    const maintainerOrg = process.env.GITHUB_MAINTAINER_ORG?.trim();

    // Only process if this is our configured org
    if (
      !maintainerOrg ||
      organization.login.toLowerCase() !== maintainerOrg.toLowerCase()
    ) {
      return NextResponse.json({ status: "ignored" }, { status: 202 });
    }

    // Log the webhook receipt for health visibility
    const eventLog = {
      webhook: "github.organization.member",
      action,
      member: member.login,
      actor: sender.login,
      org: organization.login,
      timestamp: new Date().toISOString(),
    };

    console.log("Webhook received:", eventLog);

    // Handle membership changes
    if (action === "added" || action === "deleted") {
      const user = await prisma.user.findUnique({
        where: { githubUsername: member.login },
      });

      if (user) {
        // Mark for audit — maintainer access is now stale and will be re-checked on next sign-in
        await recordAuditLog({
          action: "webhook.org_membership_changed",
          actorId: null,
          actorLogin: sender.login,
          targetId: user.id,
          targetLabel: member.login,
          metadata: {
            membershipAction: action,
            org: organization.login,
            webhookId: request.headers.get("X-GitHub-Delivery") || "unknown",
          },
        });

        console.log(`Org membership sync: ${member.login} ${action} from ${organization.login}`);
      } else {
        console.log(
          `User not found in database: ${member.login} (may not have registered yet)`
        );
      }
    }

    // Return 202 Accepted (webhook processed asynchronously)
    return NextResponse.json(
      {
        status: "accepted",
        event: eventLog,
      },
      { status: 202 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    console.error("Webhook error:", message);

    // Return 202 anyway to prevent GitHub from retrying
    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 202 }
    );
  }
}
