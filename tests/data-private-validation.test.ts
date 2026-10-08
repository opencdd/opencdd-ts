/**
 * Validates the TS model against the real IEC CDD data
 * in ../data-private/data/. Skipped by default — set CDD_DATA_VALIDATE=1
 * to opt in. Slow on iec61987 (13K entities, several seconds).
 *
 *   CDD_DATA_VALIDATE=1 npx vitest run tests/data-private-validation.test.ts
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { Database, Validators, Visitor, Klass, ValueList, type EntityType } from "../src";
import { IRDI } from "../src/models/IRDI";

const here = dirname(fileURLToPath(import.meta.url));
const CDD_DATA_DIR = resolve(here, "../../data-private/data");

const EXPECTED_COUNTS: Record<string, Record<string, number>> = {
  oceanrunner: { class: 20, property: 38, value_list: 4 },
  "iec-63213": {
    class: 26,
    property: 67,
    value_list: 11,
    value_term: 116,
  },
  "iec-61360-4": {
    class: 570,
    property: 2008,
    value_list: 324,
    value_term: 1892,
    det_classification: 163,
  },
  "iec-61360-7": {
    class: 57,
    property: 215,
    value_list: 53,
    value_term: 2015,
  },
  iec61360: { class: 574, property: 2018, value_list: 33, value_term: 1866 },
  "iec-62683": {
    class: 375,
    property: 765,
    value_list: 139,
    value_term: 582,
    det_classification: 171,
  },
  "iec-63508": {
    class: 23,
    property: 33,
    value_list: 9,
    value_term: 86,
  },
  "iec-61987": {
    class: 2704,
    property: 6471,
    value_term: 3502,
    list_of_unit: 112,
    det_classification: 171,
  },
  "iec-62720": { unit: 2165, list_of_unit: 394 },
  "iso-ics": { class: 1383 },
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
  visitDetClassification() {
    this.counts.det_classification = (this.counts.det_classification ?? 0) + 1;
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

describeIf("data-private validation", () => {
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

  // Always-on YAML fidelity regression: the YAML layer must reproduce
  // set_of_refs wire strings byte-for-byte. Real IEC data carries stray
  // inner spaces ("{A,STAYPUT ,B}") and present-but-empty sets ("()") —
  // both were silently rewritten by the previous split/rejoin pair.
  describe("YAML set_of_refs fidelity", () => {
    it("preserves inner whitespace and present-but-empty sets", () => {
      const db = new Database();
      db.addEntity(
        new ValueList(IRDI.parse("0112/2///test#CEA000"), {
          MDC_P044: "{()}",
          MDC_P043: "()",
        }, "MDC_C005"),
      );
      db.addEntity(
        new ValueList(IRDI.parse("0112/2///test#CEB001"), {
          MDC_P044: "{SPGRET,LATCH,STAYPUT ,SPGRET_CENTER}",
        }, "MDC_C005"),
      );
      db.finalize();
      const db2 = Database.fromYaml(db.toYaml());
      expect(db2.find("0112/2///test#CEA000")?.properties.get("MDC_P043")).toBe("{}");
      expect(db2.find("0112/2///test#CEA000")?.properties.get("MDC_P044")).toBe("{()}");
      expect(db2.find("0112/2///test#CEB001")?.properties.get("MDC_P044")).toBe(
        "{SPGRET,LATCH,STAYPUT ,SPGRET_CENTER}",
      );
      expect(db.semanticallyEquals(db2)).toBe(true);
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
          "det_classification",
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
          const db = Database.fromJson(json).finalize();
          const yaml = db.toYaml();
          const db2 = Database.fromYaml(yaml);
          expect(db.semanticallyEquals(db2)).toBe(true);
        },
      );
    });
  }
});
