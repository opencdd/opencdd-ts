import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { rm } from "node:fs/promises";
import { Cddal, Database } from "../src";

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, "fixtures/oceanrunner.cddal");
const source = readFileSync(fixturePath, "utf8");

describe("YAML database persistence", () => {
  it("round-trips Database → YAML → Database (semantic equality)", () => {
    const db1 = Cddal.parse(source);
    const yaml = db1.toYaml();
    expect(yaml.length).toBeGreaterThan(0);
    const db2 = Database.fromYaml(yaml);
    expect(db2.semanticallyEquals(db1)).toBe(true);
  });

  it("uses semantic CDD attribute names in the YAML", () => {
    const db = Cddal.parse(source);
    const yaml = db.toYaml();
    expect(yaml).toContain("preferred_name:");
    expect(yaml).toContain("source_language:");
    expect(yaml).toContain("translation_languages:");
    expect(yaml).not.toContain("MDC_P004:");
  });

  it("preserves multilingual fields as nested hashes", () => {
    const yaml = `
source_language: en
translation_languages: []
entities:
  - irdi: 0112/2///OCEANRUNNER#ORA001
    type: class
    code: ORA001
    preferred_name:
      en: Vehicle
      fr: Véhicule
    class_type: ITEM_CLASS
`;
    const db = Database.fromYaml(yaml);
    const vehicle = db.findByCode("ORA001");
    expect(vehicle).not.toBeNull();
    expect(vehicle?.preferredName("en")).toBe("Vehicle");
    expect(vehicle?.preferredName("fr")).toBe("Véhicule");
  });

  it("round-trips sets (applicable_properties) as arrays", () => {
    const yaml = `
source_language: en
translation_languages: []
entities:
  - irdi: 0112/2///OCEANRUNNER#ORA001
    type: class
    code: ORA001
    applicable_properties:
      - 0112/2///61360_4#ORB001
      - 0112/2///61360_4#ORB002
`;
    const db = Database.fromYaml(yaml);
    const klass = db.findByCode("ORA001");
    expect(klass).not.toBeNull();
    const out = db.toYaml();
    expect(out).toContain("applicable_properties:");
  });
});

describe("per-entity YAML directory store", () => {
  const tmpDir = resolve(here, "fixtures/_tmp-yaml-store");

  beforeEach(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  });

  it("round-trips Database → directory → Database", async () => {
    const db1 = Cddal.parse(source);
    await db1.saveToDirectory(tmpDir);
    const db2 = await Database.loadFromDirectory(tmpDir);
    expect(db2.semanticallyEquals(db1)).toBe(true);
  });

  it("writes one YAML file per entity in a sharded layout", async () => {
    const db1 = Cddal.parse(source);
    await db1.saveToDirectory(tmpDir);
    const { readdir } = await import("node:fs/promises");
    const shards = await readdir(`${tmpDir}/entities`);
    expect(shards).toContain("OR");
    const files = await readdir(`${tmpDir}/entities/OR`);
    const ora001 = files.find((f) => f.startsWith("ORA001"));
    expect(ora001).toBeDefined();
  });
});
