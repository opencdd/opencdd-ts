/**
 * Always-on JSON pipeline tests. Uses the vendored oceanrunner.json
 * fixture so CI runs these without needing cdd-data checked out.
 *
 * For full-dictionary validation against all 7 IEC dictionaries, see
 * tests/cdd-data-validation.test.ts (auto-skips when cdd-data absent).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Database } from "../src";

const here = dirname(fileURLToPath(import.meta.url));
const json = readFileSync(resolve(here, "fixtures/oceanrunner.json"), "utf8");

describe("JSON database pipeline", () => {
  it("parses oceanrunner.json to expected counts", () => {
    const db = Database.fromJson(json);
    expect(db.classes().length).toBe(20);
    expect(db.properties().length).toBe(19);
    expect(db.valueLists().length).toBe(1);
  });

  it("round-trips through toJson → fromJson with semantic equality", () => {
    const db1 = Database.fromJson(json);
    const out = db1.toJson();
    const db2 = Database.fromJson(out);
    expect(db1.semanticallyEquals(db2)).toBe(true);
  });

  it("preserves multilingual fields via raw_properties", () => {
    const db = Database.fromJson(json);
    const vehicle = db.findByCode("ORA001");
    expect(vehicle).not.toBeNull();
    expect(vehicle?.preferredName("en")).toBe("Vehicle");
  });

  it("emits raw_properties in toJson output", () => {
    const db = Database.fromJson(json);
    const out = JSON.parse(db.toJson()) as Array<{
      raw_properties?: Record<string, unknown>;
    }>;
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]?.raw_properties).toBeDefined();
  });
});
