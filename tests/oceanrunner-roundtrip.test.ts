import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Cddal } from "../src";

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, "fixtures/oceanrunner.cddal");
const source = readFileSync(fixturePath, "utf8");

describe("oceanrunner.cddal round-trip", () => {
  it("parses to the expected entity counts", () => {
    const db = Cddal.parse(source);
    expect(db.classes().length).toBe(20);
    expect(db.properties().length).toBe(19);
    expect(db.valueLists().length).toBe(1);
  });

  it("resolves symbolic names in superclass references", () => {
    const db = Cddal.parse(source);
    const vehicle = db.findByCode("ORA001");
    const boat = db.findByCode("ORA010");
    expect(boat).not.toBeNull();
    expect(vehicle).not.toBeNull();
    expect(
      boat && boat.irdi && vehicle && vehicle.irdi && boat.irdi.toString(),
    ).toBeTruthy();
  });

  it("round-trips parse → serialize → parse to a semantically equal database", () => {
    const db1 = Cddal.parse(source);
    const text = Cddal.serialize(db1);
    const db2 = Cddal.parse(text);
    expect(db1.semanticallyEquals(db2)).toBe(true);
  });
});
