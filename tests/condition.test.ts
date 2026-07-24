import { describe, expect, it } from "vitest";
import {
  Condition,
  ConditionExpression,
  ConditionClassReference,
  ConditionSyntaxError,
} from "../src";

describe("Condition.parse — expression form", () => {
  it("parses a simple equality expression", () => {
    const c = Condition.parse("operating_mode == surface_water");
    expect(c).toBeInstanceOf(ConditionExpression);
    expect(c?.type).toBe("expression");
    expect((c as ConditionExpression).left).toBe("operating_mode");
    expect((c as ConditionExpression).operator).toBe("==");
    expect((c as ConditionExpression).right).toBe("surface_water");
    expect((c as ConditionExpression).set).toBe(false);
  });

  it("parses a not-equal expression", () => {
    const c = Condition.parse("operating_mode != road");
    expect((c as ConditionExpression).operator).toBe("!=");
  });

  it("parses a set RHS", () => {
    const c = Condition.parse("mode == { surface_water, underwater }");
    expect((c as ConditionExpression).set).toBe(true);
    expect((c as ConditionExpression).right).toEqual([
      "surface_water",
      "underwater",
    ]);
  });

  it("strips surrounding quotes from a literal RHS", () => {
    const c = Condition.parse('mode == "surface water"');
    expect((c as ConditionExpression).right).toBe("surface water");
  });

  it("returns null for nil/empty input", () => {
    expect(Condition.parse(null)).toBeNull();
    expect(Condition.parse(undefined)).toBeNull();
    expect(Condition.parse("")).toBeNull();
    expect(Condition.parse("   ")).toBeNull();
  });

  it("throws ConditionSyntaxError for malformed input", () => {
    expect(() => Condition.parse("no operator here")).toThrow(
      ConditionSyntaxError,
    );
  });
});

describe("Condition.parse — class_reference form", () => {
  it("parses a bare-set class reference", () => {
    const c = Condition.parse("{0112/2///62683#ACE132}");
    expect(c).toBeInstanceOf(ConditionClassReference);
    expect(c?.type).toBe("class_reference");
    expect((c as ConditionClassReference).irdis).toEqual([
      "0112/2///62683#ACE132",
    ]);
  });

  it("parses a multi-element set", () => {
    const c = Condition.parse(
      "{0112/2///62683#ACE132, 0112/2///62683#ACE133}",
    );
    expect((c as ConditionClassReference).irdis).toEqual([
      "0112/2///62683#ACE132",
      "0112/2///62683#ACE133",
    ]);
  });

  it("parses a bare single IRDI", () => {
    const c = Condition.parse("0112/2///62683#ACE132");
    expect(c).toBeInstanceOf(ConditionClassReference);
    expect((c as ConditionClassReference).irdis).toEqual([
      "0112/2///62683#ACE132",
    ]);
  });

  it("throws ConditionSyntaxError for an empty set", () => {
    expect(() => Condition.parse("{}")).toThrow(ConditionSyntaxError);
  });
});

describe("ConditionExpression.satisfiedBy", () => {
  it("matches equality", () => {
    const c = Condition.parse("operating_mode == surface_water");
    expect(
      (c as ConditionExpression).satisfiedBy({ operating_mode: "surface_water" }),
    ).toBe(true);
  });

  it("rejects differing binding", () => {
    const c = Condition.parse("operating_mode == surface_water");
    expect(
      (c as ConditionExpression).satisfiedBy({ operating_mode: "road" }),
    ).toBe(false);
  });

  it("negates correctly", () => {
    const c = Condition.parse("operating_mode != road");
    expect(
      (c as ConditionExpression).satisfiedBy({ operating_mode: "surface_water" }),
    ).toBe(true);
    expect(
      (c as ConditionExpression).satisfiedBy({ operating_mode: "road" }),
    ).toBe(false);
  });

  it("is false when no binding exists", () => {
    const c = Condition.parse("operating_mode == surface_water");
    expect((c as ConditionExpression).satisfiedBy({ other: "x" })).toBe(false);
  });

  it("matches set membership on equality", () => {
    const c = Condition.parse("mode == { surface_water, underwater }");
    expect((c as ConditionExpression).satisfiedBy({ mode: "surface_water" })).toBe(true);
    expect((c as ConditionExpression).satisfiedBy({ mode: "underwater" })).toBe(true);
    expect((c as ConditionExpression).satisfiedBy({ mode: "road" })).toBe(false);
  });

  it("negates set membership", () => {
    const c = Condition.parse("mode != { surface_water, underwater }");
    expect((c as ConditionExpression).satisfiedBy({ mode: "road" })).toBe(true);
    expect((c as ConditionExpression).satisfiedBy({ mode: "surface_water" })).toBe(false);
  });
});

describe("Condition.toString round-trip", () => {
  it("round-trips a simple equality", () => {
    const source = "operating_mode == surface_water";
    expect(Condition.parse(source)?.toString()).toBe(source);
  });

  it("round-trips a set membership", () => {
    const source = "mode == { surface_water, underwater }";
    expect(Condition.parse(source)?.toString()).toBe(source);
  });

  it("serializes a single-IRDI class reference without braces", () => {
    const c = Condition.parse("0112/2///62683#ACE132");
    expect(c?.toString()).toBe("0112/2///62683#ACE132");
  });

  it("serializes a multi-IRDI class reference with braces", () => {
    const c = Condition.parse(
      "{0112/2///62683#ACE132, 0112/2///62683#ACE133}",
    );
    expect(c?.toString()).toBe(
      "{0112/2///62683#ACE132, 0112/2///62683#ACE133}",
    );
  });
});

describe("Condition.equals", () => {
  it("treats identical expressions as equal", () => {
    const a = Condition.parse("mode == surface_water");
    const b = Condition.parse("mode == surface_water");
    expect(a?.equals(b!)).toBe(true);
  });

  it("treats set-element order as irrelevant", () => {
    const a = Condition.parse("mode == { surface_water, underwater }");
    const b = Condition.parse("mode == { underwater, surface_water }");
    expect(a?.equals(b!)).toBe(true);
  });

  it("treats class_reference set order as irrelevant", () => {
    const a = Condition.parse(
      "{0112/2///62683#ACE132, 0112/2///62683#ACE133}",
    );
    const b = Condition.parse(
      "{0112/2///62683#ACE133, 0112/2///62683#ACE132}",
    );
    expect(a?.equals(b!)).toBe(true);
  });

  it("distinguishes expression from class_reference", () => {
    const a = Condition.parse("mode == surface_water");
    const b = Condition.parse("{0112/2///62683#ACE132}");
    expect(a?.equals(b!)).toBe(false);
  });
});

describe("Condition factories", () => {
  it("Condition.expression builds a ConditionExpression", () => {
    const c = Condition.expression("mode", "==", "surface_water");
    expect(c).toBeInstanceOf(ConditionExpression);
    expect(c.left).toBe("mode");
    expect(c.toString()).toBe("mode == surface_water");
  });

  it("Condition.classReference builds a ConditionClassReference", () => {
    const c = Condition.classReference(["0112/2///62683#ACE132"]);
    expect(c).toBeInstanceOf(ConditionClassReference);
    expect(c.irdis).toEqual(["0112/2///62683#ACE132"]);
  });
});

describe("Condition type narrowing", () => {
  it("narrows via instanceof", () => {
    const expr = Condition.parse("mode == surface_water")!;
    expect(expr).toBeInstanceOf(ConditionExpression);
    if (expr instanceof ConditionExpression) {
      expect(expr.left).toBe("mode");
    } else {
      throw new Error("expected expression");
    }

    const ref = Condition.parse("{0112/2///62683#ACE132}")!;
    expect(ref).toBeInstanceOf(ConditionClassReference);
    if (ref instanceof ConditionClassReference) {
      expect(ref.irdis).toEqual(["0112/2///62683#ACE132"]);
    } else {
      throw new Error("expected class_reference");
    }
  });

  it("exposes isExpression / isClassReference predicates", () => {
    expect(Condition.parse("mode == surface_water")?.isExpression).toBe(true);
    expect(Condition.parse("mode == surface_water")?.isClassReference).toBe(false);
    expect(Condition.parse("{0112/2///62683#ACE132}")?.isClassReference).toBe(true);
    expect(Condition.parse("{0112/2///62683#ACE132}")?.isExpression).toBe(false);
  });

  it("exposes type discriminator field", () => {
    expect(Condition.parse("mode == surface_water")?.type).toBe("expression");
    expect(Condition.parse("{0112/2///62683#ACE132}")?.type).toBe(
      "class_reference",
    );
  });
});
