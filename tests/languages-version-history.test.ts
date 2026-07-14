import { describe, it, expect } from "vitest";
import { Languages } from "../src/models/Languages";
import {
  VersionHistory,
  type VersionHistoryEntry,
} from "../src/models/VersionHistory";

describe("Languages", () => {
  it("constructs with source + translations", () => {
    const langs = new Languages("en", ["de", "fr"]);
    expect(langs.source).toBe("en");
    expect(langs.translations).toEqual(["de", "fr"]);
    expect(langs.all).toEqual(["en", "de", "fr"]);
  });

  it("deduplicates translations", () => {
    const langs = new Languages("en", ["de", "de", "fr", "en"]);
    expect(langs.translations).toEqual(["de", "fr"]);
  });

  it("includes checks all languages", () => {
    const langs = new Languages("en", ["de", "fr"]);
    expect(langs.includes("en")).toBe(true);
    expect(langs.includes("de")).toBe(true);
    expect(langs.includes("zh")).toBe(false);
  });

  it("is frozen", () => {
    const langs = new Languages("en", ["de"]);
    expect(Object.isFrozen(langs)).toBe(true);
  });

  it("fromProperties detects languages from keys", () => {
    const props = {
      "MDC_P004.en": "General data",
      "MDC_P004.de": "Allgemeine Daten",
      "MDC_P004.fr": "Données",
      "MDC_P006.en": "definition",
      MDC_P011: "ITEM_CLASS",
    };
    const langs = Languages.fromProperties(props);
    expect(langs.source).toBe("en");
    expect(langs.translations).toContain("de");
    expect(langs.translations).toContain("fr");
    expect(langs.size).toBe(3);
  });

  it("fromProperties handles empty", () => {
    const langs = Languages.fromProperties({});
    expect(langs.source).toBe("en");
    expect(langs.translations).toEqual([]);
  });
});

describe("VersionHistory", () => {
  const entries: VersionHistoryEntry[] = [
    {
      version: "001",
      revision: "04",
      status: "standard",
      timestamp: "2023-04-17",
      user: "BATCH",
      changeRequestId: null,
      unid: "ABC",
      isCurrent: true,
    },
    {
      version: "001",
      revision: "03",
      status: "superseded",
      timestamp: "2015-01-20",
      user: "BATCH2",
      changeRequestId: null,
      unid: "DEF",
      isCurrent: false,
    },
    {
      version: "001",
      revision: "02",
      status: "superseded",
      timestamp: "2012-06-15",
      user: "BATCH3",
      changeRequestId: null,
      unid: "GHI",
      isCurrent: false,
    },
  ];

  it("constructs with entries", () => {
    const vh = new VersionHistory(entries);
    expect(vh.size).toBe(3);
    expect(vh.empty).toBe(false);
  });

  it("finds current entry", () => {
    const vh = new VersionHistory(entries);
    expect(vh.current?.revision).toBe("04");
    expect(vh.current?.status).toBe("standard");
  });

  it("previous excludes current", () => {
    const vh = new VersionHistory(entries);
    expect(vh.previous).toHaveLength(2);
    expect(vh.previous.every((e) => !e.isCurrent)).toBe(true);
  });

  it("empty when no entries", () => {
    const vh = new VersionHistory();
    expect(vh.empty).toBe(true);
    expect(vh.size).toBe(0);
    expect(vh.current).toBeUndefined();
  });

  it("is iterable", () => {
    const vh = new VersionHistory(entries);
    const revisions = Array.from(vh).map((e) => e.revision);
    expect(revisions).toEqual(["04", "03", "02"]);
  });

  it("is frozen", () => {
    const vh = new VersionHistory(entries);
    expect(Object.isFrozen(vh)).toBe(true);
  });
});
