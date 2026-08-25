import { describe, it, expect } from "vitest";
import {
  generateEmailTemplate,
  generateMarkdownTemplate,
  generatePlainTemplate,
  generateTemplate,
  type TemplateOptions,
} from "./outreach-templates";

describe("outreach-templates", () => {
  const baseOptions: TemplateOptions = {
    contributorName: "Alice",
    waveNumber: 3,
    deadline: new Date("2026-08-01"),
    minXlmBalance: 2,
    supportEmail: "help@example.com",
    assetCode: "USDC",
    assetIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  };

  describe("generateEmailTemplate", () => {
    it("should generate email template with all options", () => {
      const template = generateEmailTemplate(baseOptions);

      expect(template).toContain("Subject: Wave 3 Payout Readiness Check");
      expect(template).toContain("Dear Alice");
      expect(template).toContain("August 1, 2026");
      expect(template).toContain("2 XLM");
      expect(template).toContain("USDC");
      expect(template).toContain("help@example.com");
    });

    it("should use defaults when options not provided", () => {
      const template = generateEmailTemplate({});

      expect(template).toContain("Wave 1");
      expect(template).toContain("Contributor");
      // Default mirrors trustbridge-action's `min_xlm_reserve` (1.5), so the
      // reserve a contributor is told to fund is the one the Action enforces.
      expect(template).toContain("1.5 XLM");
      expect(template).toContain("support@trustbridge.dev");
    });

    it("should include trustline setup instructions", () => {
      const template = generateEmailTemplate(baseOptions);

      expect(template).toContain("Set Up USDC Trustline");
      expect(template).toContain("authorized");
    });

    it("should include wallet proof instructions", () => {
      const template = generateEmailTemplate(baseOptions);

      expect(template).toContain("Wallet Proof");
      expect(template).toContain("public address");
    });
  });

  describe("generateMarkdownTemplate", () => {
    it("should generate markdown template", () => {
      const template = generateMarkdownTemplate(baseOptions);

      expect(template).toContain("# Wave 3 Payout Readiness");
      expect(template).toContain("Hi Alice!");
      expect(template).toContain("## ✅ Checklist");
      expect(template).toContain("## 📸 Wallet Proof");
    });

    it("should include markdown formatting", () => {
      const template = generateMarkdownTemplate(baseOptions);

      expect(template).toContain("- [ ]"); // checkboxes
      expect(template).toContain("|"); // table
      expect(template).toContain("**"); // bold
    });
  });

  describe("generatePlainTemplate", () => {
    it("should generate plain text template", () => {
      const template = generatePlainTemplate(baseOptions);

      expect(template).toContain("WAVE 3 PAYOUT READINESS CHECKLIST");
      expect(template).toContain("Hello Alice");
      expect(template).toContain("STEP 1:");
      expect(template).toContain("STEP 2:");
      expect(template).toContain("STEP 3:");
    });

    it("should not include markdown formatting", () => {
      const template = generatePlainTemplate(baseOptions);

      expect(template).not.toContain("**");
      expect(template).not.toContain("# ");
      expect(template).not.toContain("- [ ]");
    });
  });

  describe("generateTemplate", () => {
    it("should generate email format", () => {
      const template = generateTemplate("email", baseOptions);
      expect(template).toContain("Subject:");
      expect(template).toContain("Dear Alice");
    });

    it("should generate markdown format", () => {
      const template = generateTemplate("markdown", baseOptions);
      expect(template).toContain("# Wave");
      expect(template).toContain("## ✅");
    });

    it("should generate plain format", () => {
      const template = generateTemplate("plain", baseOptions);
      expect(template).toContain("WAVE");
      expect(template).toContain("STEP");
    });

    it("should throw error on invalid format", () => {
      expect(() => {
        generateTemplate("invalid" as any, baseOptions);
      }).toThrow("Unknown template format");
    });

    it("should use custom contributor name", () => {
      const template = generateTemplate("email", {
        ...baseOptions,
        contributorName: "Bob",
      });
      expect(template).toContain("Dear Bob");
    });

    it("should format dates correctly", () => {
      const template = generateTemplate("email", baseOptions);
      expect(template).toMatch(/August \d{1,2}, 2026/);
    });
  });

  describe("template content consistency", () => {
    it("all formats should mention the asset code", () => {
      const email = generateEmailTemplate(baseOptions);
      const markdown = generateMarkdownTemplate(baseOptions);
      const plain = generatePlainTemplate(baseOptions);

      expect(email).toContain("USDC");
      expect(markdown).toContain("USDC");
      expect(plain).toContain("USDC");
    });

    it("all formats should include minimum XLM requirement", () => {
      const email = generateEmailTemplate(baseOptions);
      const markdown = generateMarkdownTemplate(baseOptions);
      const plain = generatePlainTemplate(baseOptions);

      expect(email).toContain("2 XLM");
      expect(markdown).toContain("2 XLM");
      expect(plain).toContain("2 XLM");
    });

    it("all formats should reference dashboard", () => {
      const email = generateEmailTemplate(baseOptions);
      const markdown = generateMarkdownTemplate(baseOptions);
      const plain = generatePlainTemplate(baseOptions);

      expect(email).toContain("trustbridge.dev");
      expect(markdown).toContain("trustbridge.dev");
      expect(plain).toContain("trustbridge.dev");
    });
  });
});
