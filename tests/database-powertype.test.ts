import { describe, expect, it } from "vitest";
import { Cddal, Database, Klass } from "../src";

const FIXTURE = `
meta-class MDC_C002 {
  code
  preferred_name
  class_type
  is_case_of
  applicable_properties
}
instance EngineType < MDC_C002 {
  code: AAA200
  preferred_name.en: "Engine Type"
  class_type: CATEGORICAL_CLASS
}
instance SingleDiesel < MDC_C002 {
  code: AAA201
  preferred_name.en: "Single Diesel"
  class_type: ITEM_CLASS
  is_case_of: { AAA200 }
}
instance TwinDiesel < MDC_C002 {
  code: AAA202
  preferred_name.en: "Twin Diesel"
  class_type: ITEM_CLASS
  is_case_of: { AAA200 }
}
instance Vehicle < MDC_C002 {
  code: AAA001
  preferred_name.en: "Vehicle"
  class_type: ITEM_CLASS
}
`;

describe("Database powertype API", () => {
  let db: Database;
  beforeEach(() => {
    db = Cddal.parse(FIXTURE);
  });

  it("lists categorical classes", () => {
    const cats = db.categoricalClasses();
    expect(cats.map((k) => k.code)).toEqual(["AAA200"]);
  });

  it("instancesOf returns categorical instances of a categorical class", () => {
    const instances = db.instancesOf("AAA200");
    expect(instances.map((k) => k.code).sort()).toEqual(["AAA201", "AAA202"]);
  });

  it("instancesOf returns [] for a non-categorical class", () => {
    expect(db.instancesOf("AAA001")).toEqual([]);
  });

  it("instancesOf accepts IRDI, code, or entity", () => {
    const byCode = db.instancesOf("AAA200");
    const byEntity = db.instancesOf(db.findByCode("AAA200") as Klass);
    expect(byEntity.length).toBe(byCode.length);
  });

  it("validClassReference returns true for a categorical instance", () => {
    expect(db.validClassReference("AAA200", "AAA201")).toBe(true);
    expect(db.validClassReference("AAA200", "AAA202")).toBe(true);
  });

  it("validClassReference returns false for a non-instance", () => {
    expect(db.validClassReference("AAA200", "AAA001")).toBe(false);
  });

  it("validClassReference returns false for an unresolved value", () => {
    expect(db.validClassReference("AAA200", "NONEXISTENT")).toBe(false);
  });
});
