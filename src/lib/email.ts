import "server-only";

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  recipientName?: string;
}

export interface NotReadyNotification extends EmailNotification {
  contributorUsername: string;
  reason: "unfunded" | "no_trustline" | "low_reserve";
  lastCheckedAt?: Date;
}

export async function sendEmailNotification(
  notification: EmailNotification
): Promise<boolean> {
  const emailService = process.env.EMAIL_SERVICE || "console";

  if (emailService === "console") {
    return sendViaConsole(notification);
  }

  if (emailService === "resend") {
    return sendViaResend(notification);
  }

  console.warn(`Unknown EMAIL_SERVICE: ${emailService}, falling back to console`);
  return sendViaConsole(notification);
}

async function sendViaConsole(
  notification: EmailNotification
): Promise<boolean> {
  console.log(`[EMAIL] To: ${notification.to}`);
  console.log(`[EMAIL] Subject: ${notification.subject}`);
  console.log(`[EMAIL] Body:\n${notification.body}`);
  return true;
}

async function sendViaResend(
  notification: EmailNotification
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set, email not sent");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "noreply@trustbridge.dev",
        to: notification.to,
        subject: notification.subject,
        html: notification.body,
      }),
    });

    if (!response.ok) {
      console.error(
        `Resend API error: ${response.status} ${response.statusText}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    return false;
  }
}

export function buildNotReadyEmailBody(
  contributorUsername: string,
  reason: "unfunded" | "no_trustline" | "low_reserve"
): string {
  const reasonText = {
    unfunded: "Account not funded with XLM",
    no_trustline: "USDC trustline not established",
    low_reserve: "Insufficient spendable XLM balance",
  }[reason];

  return `
<h2>Registration Not Ready: ${contributorUsername}</h2>
<p>The registration for <strong>${contributorUsername}</strong> is currently not ready for Wave payout:</p>
<p><strong>Reason:</strong> ${reasonText}</p>
<p>Please contact the contributor to resolve this issue before the next Wave payout.</p>
<p>Visit the <a href="${process.env.NEXTAUTH_URL || "https://trustbridge.dev"}/dashboard">maintainer dashboard</a> for more details.</p>
  `.trim();
}
