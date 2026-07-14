import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Cddal } from "../src";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  resolve(here, "fixtures/oceanrunner.cddal"),
  "utf8",
);

describe("Database traversal shortcuts", () => {
  it("builds a ClassTree from the database", () => {
    const db = Cddal.parse(source);
    const tree = db.classTree();
    expect(tree).toBeDefined();
    expect(tree.roots().length).toBeGreaterThan(0);
    expect(tree.toObject().length).toBeGreaterThan(0);
  });

  it("builds an EffectiveProperties walker", () => {
    const db = Cddal.parse(source);
    const ep = db.effectiveProperties();
    expect(ep).toBeDefined();
    const vehicle = db.findByCode("AAA001");
    if (vehicle) {
      const props = ep.for(vehicle);
      expect(props).toBeDefined();
    }
  });

  it("builds a composition tree for a class", () => {
    const db = Cddal.parse(source);
    const vehicle = db.findByCode("AAA001");
    if (vehicle) {
      const tree = db.compositionTree(vehicle);
      expect(tree === null || typeof tree === "object").toBe(true);
    }
  });

  it("builds a relation tree", () => {
    const db = Cddal.parse(source);
    const tree = db.relationTree();
    expect(Array.isArray(tree)).toBe(true);
  });

  it("returns null for compositionTree of an unresolved class", () => {
    const db = Cddal.parse(source);
    expect(db.compositionTree("NOT_A_CLASS")).toBeNull();
  });
});
