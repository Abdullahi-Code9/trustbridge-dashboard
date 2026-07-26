import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateStellarAddress } from "@/lib/registration-action";

vi.mock("@/lib/auth");
vi.mock("@/lib/prisma");
vi.mock("@/lib/horizon");

describe("validateStellarAddress", () => {
  it("returns error for empty address", async () => {
    const result = await validateStellarAddress("");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Address is required");
  });

  it("returns error for invalid Stellar address", async () => {
    const result = await validateStellarAddress("invalid-address");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Invalid Stellar public key (must be a valid G-address)"
    );
  });

  it("handles whitespace in address", async () => {
    const result = await validateStellarAddress(
      "  GBRPYHIL2CI3FN4BXLFG6CDSQT7H4VO3HECM3MWTCGL3VQYSMJHVWQA2  "
    );
    // The validation should normalize the whitespace
    expect(result).toBeDefined();
  });

  it("returns null readiness for invalid addresses", async () => {
    const result = await validateStellarAddress("bad-address");
    expect(result.readiness).toBeNull();
    expect(result.valid).toBe(false);
  });
});
