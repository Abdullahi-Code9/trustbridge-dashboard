import { describe, it, expect, vi } from "vitest";
import {
  sendEmailNotification,
  buildNotReadyEmailBody,
} from "@/lib/email";

describe("Email service", () => {
  it("builds not-ready email body with unfunded reason", () => {
    const body = buildNotReadyEmailBody("contributor1", "unfunded");
    expect(body).toContain("contributor1");
    expect(body).toContain("Account not funded with XLM");
    expect(body).toContain("maintainer dashboard");
  });

  it("builds not-ready email body with no_trustline reason", () => {
    const body = buildNotReadyEmailBody("contributor2", "no_trustline");
    expect(body).toContain("contributor2");
    expect(body).toContain("USDC trustline not established");
  });

  it("builds not-ready email body with low_reserve reason", () => {
    const body = buildNotReadyEmailBody("contributor3", "low_reserve");
    expect(body).toContain("contributor3");
    expect(body).toContain("Insufficient spendable XLM balance");
  });

  it("sends notification with console service", async () => {
    const consoleSpy = vi.spyOn(console, "log");
    const result = await sendEmailNotification({
      to: "test@example.com",
      subject: "Test email",
      body: "Test body",
    });

    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("test@example.com"));
    consoleSpy.mockRestore();
  });
});
