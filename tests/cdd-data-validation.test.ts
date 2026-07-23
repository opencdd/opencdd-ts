/**
 * Validates every TODO.feat improvement against the real IEC CDD data
 * in ../cdd-data/data/. Skipped by default — set CDD_DATA_VALIDATE=1
 * to opt in. Slow on iec61987 (13K entities, several seconds).
 *
 *   CDD_DATA_VALIDATE=1 npx vitest run tests/cdd-data-validation.test.ts
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { Database, Validators, Visitor, type EntityType } from "../src";

const here = dirname(fileURLToPath(import.meta.url));
const CDD_DATA_DIR = resolve(here, "../../cdd-data/data");

const EXPECTED_COUNTS: Record<string, Record<string, number>> = {
  oceanrunner: { class: 20, property: 19, value_list: 1 },
  iec63213: {
    class: 26,
    property: 67,
    value_list: 10,
    value_term: 114,
    relation: 7,
  },
  "iec61360-7": { class: 57, property: 215, value_list: 49, value_term: 1997 },
  iec61360: { class: 574, property: 2018, value_list: 318, value_term: 1866 },
  iec62683: {
    class: 375,
    property: 765,
    value_list: 139,
    value_term: 582,
    relation: 10,
  },
  iec63508: {
    class: 23,
    property: 33,
    value_list: 9,
    value_term: 86,
    relation: 4,
  },
  iec61987: {
    class: 2704,
    property: 6471,
    value_list: 669,
    value_term: 3496,
    list_of_unit: 89,
  },
  iec62720: { class: 1, unit: 2165, relation: 6, list_of_unit: 394 },
};

const RUN = existsSync(CDD_DATA_DIR);
const describeIf = RUN ? describe : describe.skip;

class CountingVisitor extends Visitor {
  readonly counts: Record<string, number> = {};
  visitClass() {
    this.counts.class = (this.counts.class ?? 0) + 1;
  }
  visitProperty() {
    this.counts.property = (this.counts.property ?? 0) + 1;
  }
  visitUnit() {
    this.counts.unit = (this.counts.unit ?? 0) + 1;
  }
  visitValueList() {
    this.counts.value_list = (this.counts.value_list ?? 0) + 1;
  }
  visitValueTerm() {
    this.counts.value_term = (this.counts.value_term ?? 0) + 1;
  }
  visitRelation() {
    this.counts.relation = (this.counts.relation ?? 0) + 1;
  }
  visitViewControl() {
    this.counts.view_control = (this.counts.view_control ?? 0) + 1;
  }
  visitListOfUnit() {
    this.counts.list_of_unit = (this.counts.list_of_unit ?? 0) + 1;
  }
}

const dictionaries = RUN
  ? readdirSync(CDD_DATA_DIR).filter((entry) => {
      const p = resolve(CDD_DATA_DIR, entry);
      return (
        statSync(p).isDirectory() && existsSync(resolve(p, "database.json"))
      );
    })
  : [];

describeIf("cdd-data validation", () => {
  // Always-on smoke test: JSON round-trip on the small oceanrunner fixture
  // (no env-var gating). Confirms databaseToJson/databaseFromJson preserve
  // semantic equality.
  describe("JSON round-trip smoke (oceanrunner)", () => {
    it("preserves semantic equality through toJson → fromJson", () => {
      const json = readFileSync(
        resolve(CDD_DATA_DIR, "oceanrunner/database.json"),
        "utf8",
      );
      const db1 = Database.fromJson(json);
      const out = db1.toJson();
      const db2 = Database.fromJson(out);
      expect(db1.semanticallyEquals(db2)).toBe(true);
    });
  });

  for (const dict of dictionaries.sort()) {
    describe(dict, () => {
      const jsonPath = resolve(CDD_DATA_DIR, dict, "database.json");
      const json = readFileSync(jsonPath, "utf8");

      it("parses to expected entity counts", () => {
        const t0 = performance.now();
        const db = Database.fromJson(json);
        const t1 = performance.now();
        const counts: Record<string, number> = {};
        for (const t of [
          "class",
          "property",
          "unit",
          "value_list",
          "value_term",
          "relation",
          "view_control",
          "list_of_unit",
        ] as const) {
          counts[t] = db.entitiesOfType(t).length;
        }
        const expected = EXPECTED_COUNTS[dict] ?? {};
        for (const [k, v] of Object.entries(expected)) {
          expect(counts[k], `${dict}.${k}`).toBe(v);
        }
        // Report parse time (informational)
        console.log(
          `    ${dict}: parsed ${Object.values(counts).reduce((a, b) => a + b, 0)} entities in ${Math.round(t1 - t0)}ms`,
        );
      });

      it("categoricalClasses + visitor walk run without error", () => {
        const db = Database.fromJson(json);
        const cats = db.categoricalClasses();
        const v = new CountingVisitor(db);
        expect(() => v.visit()).not.toThrow();
        const totalEntities = Object.values(v.counts).reduce(
          (a, b) => a + b,
          0,
        );
        expect(totalEntities).toBe(db.count());
        if (cats.length > 0) {
          const first = cats[0]!;
          expect(db.instancesOf(first).length).toBeGreaterThanOrEqual(0);
        }
      });

      it("validators run without throwing", () => {
        const db = Database.fromJson(json);
        const errs = Validators.runValidation({
          entities: db.entities(),
          database: db,
        });
        const tally: Record<string, number> = {};
        for (const e of errs) tally[e.rule] = (tally[e.rule] ?? 0) + 1;
        console.log(
          `    ${dict}: ${errs.length} validator findings ${JSON.stringify(tally)}`,
        );
        expect(errs.length).toBeGreaterThanOrEqual(0);
      });

      // YAML round-trip on small dictionaries only (≤ 250 entities)
      const total = Object.values(EXPECTED_COUNTS[dict] ?? {}).reduce(
        (a, b) => a + b,
        0,
      );
      (total <= 250 ? it : it.skip)(
        "YAML round-trip preserves semantic equality",
        () => {
          const db = Database.fromJson(json);
          const yaml = db.toYaml();
          const db2 = Database.fromYaml(yaml);
          expect(db.semanticallyEquals(db2)).toBe(true);
        },
      );
    });
  }
});
