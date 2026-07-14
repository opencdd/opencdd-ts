import { describe, expect, it } from "vitest";
import { Validators, Cddal } from "../src";

const FIXTURE = `
meta-class MDC_C002 {
  code
  preferred_name
  class_type
  is_case_of
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
instance Vehicle < MDC_C002 {
  code: AAA001
  preferred_name.en: "Vehicle"
  class_type: ITEM_CLASS
}

meta-class MDC_C003 {
  code
  preferred_name
  data_type
  definition_class
}
instance engine_option < MDC_C003 {
  code: AAAP200
  preferred_name.en: "engine option"
  data_type: CLASS_REFERENCE(EngineType)
  definition_class: AAA201
}
instance invalid_ref < MDC_C003 {
  code: AAAP201
  preferred_name.en: "invalid reference"
  data_type: CLASS_REFERENCE(EngineType)
  definition_class: AAA001
}
`;

describe("R16 CLASS_REFERENCE validator", () => {
  it("passes when a CLASS_REFERENCE value is a valid categorical instance", () => {
    const db = Cddal.parse(FIXTURE);
    const errors = Validators.runValidation({
      entities: db.entities(),
      database: db,
    });
    const r16ForValid = errors.filter(
      (e) => e.rule === "R16" && e.row?.includes("AAAP200"),
    );
    expect(r16ForValid).toEqual([]);
  });

  it("fails when a CLASS_REFERENCE value is not a categorical instance", () => {
    const db = Cddal.parse(FIXTURE);
    const errors = Validators.runValidation({
      entities: db.entities(),
      database: db,
    });
    const r16ForInvalid = errors.filter(
      (e) => e.rule === "R16" && e.row?.includes("AAAP201"),
    );
    expect(r16ForInvalid.length).toBeGreaterThan(0);
    expect(r16ForInvalid[0].message).toContain("CLASS_REFERENCE(EngineType)");
  });

  it("skips when no database is supplied", () => {
    const db = Cddal.parse(FIXTURE);
    const errors = Validators.runValidation({ entities: db.entities() });
    const r16 = errors.filter((e) => e.rule === "R16");
    expect(r16).toEqual([]);
  });
});
