import { describe, expect, it } from "vitest";
import { RelationType } from "../src";

describe("RelationType", () => {
  it("parses valid values", () => {
    expect(RelationType.parse("PREDICATION")?.value).toBe("PREDICATION");
    expect(RelationType.parse("function")?.value).toBe("FUNCTION");
    expect(RelationType.parse("  Composition  ")?.value).toBe("COMPOSITION");
  });

  it("rejects invalid values", () => {
    expect(RelationType.parse("NOT_A_TYPE")).toBeNull();
    expect(RelationType.parse("")).toBeNull();
    expect(RelationType.parse(null)).toBeNull();
    expect(RelationType.parse(undefined)).toBeNull();
  });

  it("exposes predicate helpers", () => {
    expect(RelationType.PREDICATION.predication).toBe(true);
    expect(RelationType.PREDICATION.function).toBe(false);
    expect(RelationType.FUNCTION.function).toBe(true);
    expect(RelationType.GENERALIZATION.hierarchical).toBe(true);
    expect(RelationType.SPECIALIZATION.hierarchical).toBe(true);
    expect(RelationType.AGGREGATION.hierarchical).toBe(true);
    expect(RelationType.COMPOSITION.hierarchical).toBe(true);
    expect(RelationType.PREDICATION.hierarchical).toBe(false);
    expect(RelationType.FUNCTION.hierarchical).toBe(false);
    expect(RelationType.ASSOCIATION.hierarchical).toBe(false);
  });

  it("round-trips through toString", () => {
    for (const v of [
      "PREDICATION",
      "FUNCTION",
      "ASSOCIATION",
      "COMPOSITION",
    ] as const) {
      const rt = RelationType.parse(v);
      expect(rt?.toString()).toBe(v);
    }
  });

  it("implements value equality", () => {
    expect(
      RelationType.PREDICATION.equals(RelationType.parse("PREDICATION")!),
    ).toBe(true);
    expect(RelationType.PREDICATION.equals(RelationType.FUNCTION)).toBe(false);
  });

  it("freezes instances", () => {
    expect(Object.isFrozen(RelationType.PREDICATION)).toBe(true);
  });
});
