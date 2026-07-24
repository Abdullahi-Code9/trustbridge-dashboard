import { describe, it, expect } from "vitest";
import {
  escapeCsvCell,
  buildCsv,
  buildCsvFilename,
  buildJson,
  buildJsonFilename,
} from "@/lib/csv";

describe("CSV helpers", () => {
  it("escapes quotes in CSV cells", () => {
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
  });

  it("handles null and undefined", () => {
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(undefined)).toBe('""');
  });

  it("builds CSV with headers and rows", () => {
    const csv = buildCsv(
      ["name", "value"],
      [
        ["alice", 100],
        ["bob", 200],
      ]
    );
    expect(csv).toMatchSnapshot();
  });

  it("builds CSV filename with date", () => {
    const date = new Date("2024-06-15");
    expect(buildCsvFilename("wave", date)).toBe("wave-2024-06-15.csv");
  });
});

describe("JSON helpers", () => {
  it("builds JSON from headers and rows", () => {
    const json = buildJson(
      ["name", "value"],
      [
        ["alice", 100],
        ["bob", 200],
      ]
    );
    expect(json).toMatchSnapshot();
  });

  it("builds JSON filename with date", () => {
    const date = new Date("2024-06-15");
    expect(buildJsonFilename("wave", date)).toBe("wave-2024-06-15.json");
  });
});
