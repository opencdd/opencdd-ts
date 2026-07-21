/**
 * Validates Parcel Excel reading against real IEC CDD files in
 * cdd-data/data/<dict>/parcel/*.xlsx + reference-docs legacy .xls.
 *
 * Auto-skips when cdd-data isn't checked out (CI-friendly).
 */

import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Database, WorkbookReader, FlatDirReader } from "../src";

const here = dirname(fileURLToPath(import.meta.url));
const CDD_DATA_DIR = resolve(here, "../../cdd-data/data");
const REFERENCE_DOCS = resolve(here, "../../cdd-data/reference-docs");

const RUN = existsSync(CDD_DATA_DIR);
const describeIf = RUN ? describe : describe.skip;

describeIf("Parcel xlsx reader", () => {
  const dicts = readdirSync(CDD_DATA_DIR).filter((d) => {
    const p = resolve(CDD_DATA_DIR, d, "parcel");
    return existsSync(p) && statSync(p).isDirectory();
  });

  for (const dict of dicts.sort()) {
    describe(dict, () => {
      const parcelDir = resolve(CDD_DATA_DIR, dict, "parcel");
      const files = readdirSync(parcelDir).filter((f) => f.endsWith(".xlsx"));

      for (const file of files) {
        const path = resolve(parcelDir, file);
        it(`parses ${file} and extracts entities`, () => {
          const wb = WorkbookReader.fromPath(path);
          const db = new Database();
          db.addWorkbook(wb);
          db.finalize();
          const counts: Record<string, number> = {};
          for (const t of [
            "class",
            "property",
            "value_list",
            "value_term",
            "unit",
            "relation",
            "view_control",
          ]) {
            counts[t] = db.entitiesOfType(t as never).length;
          }
          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          console.log(
            `    ${dict}/${file}: ${JSON.stringify(counts)} (total ${total})`,
          );
          // Parcel files for these dictionaries should always have at
          // least some classes + properties — sanity check.
          expect(total, `${dict}/${file} extracted 0 entities`).toBeGreaterThan(
            0,
          );
        });
      }
    });
  }
});

describeIf("Parcel legacy .xls reader", () => {
  it("reads the ISO ICS legacy .xls file", () => {
    const icsPath = resolve(
      REFERENCE_DOCS,
      "export_CDD_ISO ICS in EXCEL format.xls",
    );
    if (!existsSync(icsPath)) {
      console.log("ISO ICS .xls not present, skipping");
      return;
    }
    const wb = WorkbookReader.fromPath(icsPath);
    expect(wb.sheets.length).toBeGreaterThan(0);
    const db = new Database();
    db.addWorkbook(wb);
    db.finalize();
    console.log(`    ISO ICS: ${db.count()} entities`);
    expect(db.count()).toBeGreaterThan(0);
  });

  it("reads the IEC62368 legacy 6-file .xls layout", () => {
    const dir = resolve(REFERENCE_DOCS, "export_CDD_IEC62368 in EXCEL format");
    if (!existsSync(dir)) {
      console.log("IEC62368 legacy dir not present, skipping");
      return;
    }
    const wb = FlatDirReader.fromPath(dir);
    expect(wb.sheets.length).toBeGreaterThan(0);
    const db = new Database();
    db.addWorkbook(wb);
    db.finalize();
    console.log(
      `    IEC62368: ${db.count()} entities across ${wb.sheets.length} sheets`,
    );
    expect(db.count()).toBeGreaterThan(0);
  });
});
