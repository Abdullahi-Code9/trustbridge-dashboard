import { afterEach, describe, expect, it, vi } from "vitest";

import {
  classifyHorizonNetwork,
  classifySorobanNetwork,
  getNetworkConfig,
} from "@/lib/network-config";

describe("classifyHorizonNetwork", () => {
  it("classifies the canonical mainnet Horizon hostname", () => {
    expect(classifyHorizonNetwork("https://horizon.stellar.org")).toBe(
      "mainnet"
    );
  });

  it("classifies the canonical testnet Horizon hostname", () => {
    expect(
      classifyHorizonNetwork("https://horizon-testnet.stellar.org")
    ).toBe("testnet");
  });

  it("treats unrecognized hostnames as custom", () => {
    expect(classifyHorizonNetwork("https://horizon.example.com")).toBe(
      "custom"
    );
  });

  it("treats an unparseable URL as custom rather than throwing", () => {
    expect(classifyHorizonNetwork("not-a-url")).toBe("custom");
  });
});

describe("classifySorobanNetwork", () => {
  it("classifies the canonical testnet Soroban RPC hostname", () => {
    expect(
      classifySorobanNetwork("https://soroban-testnet.stellar.org")
    ).toBe("testnet");
  });

  it("classifies the documented mainnet Soroban RPC hostname", () => {
    expect(classifySorobanNetwork("https://mainnet.sorobanrpc.com")).toBe(
      "mainnet"
    );
  });

  it("treats unrecognized hostnames as custom (e.g. private RPC nodes)", () => {
    expect(classifySorobanNetwork("https://rpc.myteam.internal")).toBe(
      "custom"
    );
  });
});

describe("getNetworkConfig", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllEnvs();
  });

  it("is not mismatched when both endpoints resolve to testnet", () => {
    process.env.NEXT_PUBLIC_HORIZON_URL = "https://horizon-testnet.stellar.org";
    process.env.SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

    const config = getNetworkConfig();

    expect(config.horizonNetwork).toBe("testnet");
    expect(config.sorobanNetwork).toBe("testnet");
    expect(config.mismatched).toBe(false);
  });

  it("flags the project's actual default configuration as mismatched (Horizon mainnet vs Soroban testnet)", () => {
    delete process.env.NEXT_PUBLIC_HORIZON_URL;
    delete process.env.SOROBAN_RPC_URL;

    const config = getNetworkConfig();

    expect(config.horizonNetwork).toBe("mainnet");
    expect(config.sorobanNetwork).toBe("testnet");
    expect(config.mismatched).toBe(true);
    expect(config.warnings.join(" ")).toMatch(/mainnet/i);
  });

  it("does not false-positive when both endpoints are custom URLs", () => {
    process.env.NEXT_PUBLIC_HORIZON_URL = "https://horizon.myteam.internal";
    process.env.SOROBAN_RPC_URL = "https://soroban.myteam.internal";

    const config = getNetworkConfig();

    expect(config.horizonNetwork).toBe("custom");
    expect(config.sorobanNetwork).toBe("custom");
    expect(config.mismatched).toBe(false);
  });

  it("does not false-positive when one endpoint is custom and the other is a named network", () => {
    process.env.NEXT_PUBLIC_HORIZON_URL = "https://horizon.stellar.org";
    process.env.SOROBAN_RPC_URL = "https://rpc.myteam.internal";

    const config = getNetworkConfig();

    expect(config.horizonNetwork).toBe("mainnet");
    expect(config.sorobanNetwork).toBe("custom");
    expect(config.mismatched).toBe(false);
  });

  it("reports sorobanContractConfigured based on SOROBAN_CONTRACT_ID", () => {
    delete process.env.SOROBAN_CONTRACT_ID;
    expect(getNetworkConfig().sorobanContractConfigured).toBe(false);

    process.env.SOROBAN_CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
    expect(getNetworkConfig().sorobanContractConfigured).toBe(true);
  });
});
