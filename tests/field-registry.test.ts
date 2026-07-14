import { describe, expect, it } from "vitest";
import { FIELDS, fieldFor, fieldsForType } from "../src";

describe("FieldRegistry", () => {
  it("lists fields per entity type", () => {
    expect(fieldsForType("class").length).toBeGreaterThan(0);
    expect(fieldsForType("property").length).toBeGreaterThan(0);
    expect(fieldsForType("relation").length).toBeGreaterThan(0);
  });

  it("looks up a field by semantic name", () => {
    const spec = fieldFor("class", "class_type");
    expect(spec?.propertyId).toBe("MDC_P011");
    expect(spec?.valueKind).toBe("class_type");
  });

  it("looks up multilingual fields", () => {
    const spec = fieldFor("class", "preferred_name");
    expect(spec?.propertyId).toBe("MDC_P004");
    expect(spec?.valueKind).toBe("ml_string");
  });

  it("returns undefined for unknown field names", () => {
    expect(fieldFor("class", "not_a_field")).toBeUndefined();
    expect(fieldFor("nonexistent_type" as never, "any")).toBeUndefined();
  });

  it("every entity type has the common fields", () => {
    for (const type of [
      "class",
      "property",
      "unit",
      "value_list",
      "value_term",
      "relation",
      "view_control",
    ] as const) {
      const fields = fieldsForType(type);
      expect(fields.find((f) => f.name === "preferred_name")).toBeDefined();
      expect(fields.find((f) => f.name === "definition")).toBeDefined();
      expect(fields.find((f) => f.name === "guid")).toBeDefined();
    }
  });

  it("registry is frozen (immutable)", () => {
    expect(Object.isFrozen(FIELDS)).toBe(true);
  });
});
