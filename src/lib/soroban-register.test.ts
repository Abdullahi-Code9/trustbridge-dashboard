import { describe, it, expect, beforeEach } from "vitest";
import { mirrorRegistrationToSoroban } from "@/lib/soroban-register";

describe("mirrorRegistrationToSoroban", () => {
  beforeEach(() => {
    // Clear SOROBAN_CONTRACT_ID before each test
    delete process.env.SOROBAN_CONTRACT_ID;
  });

  it("returns success when SOROBAN_CONTRACT_ID is not configured", async () => {
    const registration = {
      id: "reg-1",
      userId: "user-1",
      stellarAddress: "GBSX7U7ARH74ENSCCX7FYTA5FS2YQXZHY737IBSZEOF72ULMITMZNKQ",
      trustlineReady: true,
      trustlineAuthorized: true,
      funded: true,
      xlmBalance: "10",
      spendableXlmBalance: "9",
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await mirrorRegistrationToSoroban(registration);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.txHash).toBeUndefined();
  });

  it("returns success when SOROBAN_CONTRACT_ID is configured but empty", async () => {
    process.env.SOROBAN_CONTRACT_ID = "   ";

    const registration = {
      id: "reg-1",
      userId: "user-1",
      stellarAddress: "GBSX7U7ARH74ENSCCX7FYTA5FS2YQXZHY737IBSZEOF72ULMITMZNKQ",
      trustlineReady: true,
      trustlineAuthorized: true,
      funded: true,
      xlmBalance: "10",
      spendableXlmBalance: "9",
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await mirrorRegistrationToSoroban(registration);
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts a valid registration object", async () => {
    process.env.SOROBAN_CONTRACT_ID = "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";

    const registration = {
      id: "reg-1",
      userId: "user-1",
      stellarAddress: "GBSX7U7ARH74ENSCCX7FYTA5FS2YQXZHY737IBSZEOF72ULMITMZNKQ",
      trustlineReady: true,
      trustlineAuthorized: true,
      funded: true,
      xlmBalance: "100.5",
      spendableXlmBalance: "99.0",
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Should not throw even with a configured contract
    const result = await mirrorRegistrationToSoroban(registration);
    expect(typeof result.success).toBe("boolean");
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it("returns error object with proper structure on failure", async () => {
    // Test that the return type is correct even when failures occur
    process.env.SOROBAN_CONTRACT_ID = "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";

    const registration = {
      id: "reg-1",
      userId: "user-1",
      stellarAddress: "GBSX7U7ARH74ENSCCX7FYTA5FS2YQXZHY737IBSZEOF72ULMITMZNKQ",
      trustlineReady: false,
      trustlineAuthorized: false,
      funded: false,
      xlmBalance: "0",
      spendableXlmBalance: "0",
      lastCheckedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await mirrorRegistrationToSoroban(registration);

    // Verify result structure
    expect(typeof result.success).toBe("boolean");
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("errors");
  });
});
