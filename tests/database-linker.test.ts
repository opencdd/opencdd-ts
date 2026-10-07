import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Cddal, DatabaseLinker, Database, Klass } from "../src";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  resolve(here, "fixtures/oceanrunner.cddal"),
  "utf8",
);

describe("DatabaseLinker", () => {
  it("is idempotent — running linkAll twice doesn't throw or duplicate", () => {
    const db = Cddal.parse(source);
    const initialClassCount = db.classes().length;
    const linker = new DatabaseLinker(db);
    expect(() => linker.linkAll()).not.toThrow();
    expect(db.classes().length).toBe(initialClassCount);
  });

  it("populates the class hierarchy on a fresh database", () => {
    const db = Cddal.parse(source);
    const boat = db.findByCode("ORA010");
    expect(boat).toBeInstanceOf(Klass);
    if (boat instanceof Klass) {
      expect(boat.parentIrdi).not.toBeNull();
    }
  });

  it("exposes the same Database it wraps", () => {
    const db = new Database();
    const linker = new DatabaseLinker(db);
    expect(linker.database).toBe(db);
  });
});
