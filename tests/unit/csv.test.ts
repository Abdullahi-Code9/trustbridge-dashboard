import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  escapeCsvCell,
  buildCsv,
  buildCsvFilename,
  buildJson,
  buildJsonFilename,
  downloadCsv,
  downloadJson,
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

describe("Download helpers", () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
    document.createElement = vi.fn((tag: string) => {
      if (tag === "a") {
        return {
          href: "",
          download: "",
          click: vi.fn(),
        } as unknown as HTMLElement;
      }
      return document.createElement(tag);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("downloads CSV with correct blob type", () => {
    const createBlobSpy = vi.spyOn(global, "Blob");
    downloadCsv("test.csv", "a,b\n1,2");
    expect(createBlobSpy).toHaveBeenCalledWith(
      ["a,b\n1,2"],
      expect.objectContaining({ type: "text/csv;charset=utf-8;" })
    );
  });

  it("downloads JSON with correct blob type", () => {
    const createBlobSpy = vi.spyOn(global, "Blob");
    downloadJson("test.json", '{"a":1}');
    expect(createBlobSpy).toHaveBeenCalledWith(
      ['{"a":1}'],
      expect.objectContaining({ type: "application/json;charset=utf-8;" })
    );
  });
});
