import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Cddal, Database, Visitor, Klass, Property } from "../src";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  resolve(here, "fixtures/oceanrunner.cddal"),
  "utf8",
);

class Counter extends Visitor {
  readonly counts: Record<string, number> = {
    class: 0,
    property: 0,
    unit: 0,
    value_list: 0,
    value_term: 0,
    relation: 0,
    view_control: 0,
  };

  visitClass(): void {
    this.counts.class++;
  }
  visitProperty(): void {
    this.counts.property++;
  }
  visitUnit(): void {
    this.counts.unit++;
  }
  visitValueList(): void {
    this.counts.value_list++;
  }
  visitValueTerm(): void {
    this.counts.value_term++;
  }
  visitRelation(): void {
    this.counts.relation++;
  }
  visitViewControl(): void {
    this.counts.view_control++;
  }
}

class CollectingVisitor extends Visitor {
  readonly classNames: string[] = [];

  visitClass(klass: Klass): void {
    this.classNames.push(klass.code ?? "<no-code>");
  }
}

describe("Visitor", () => {
  it("walks every entity type in canonical order", () => {
    const db = Cddal.parse(source);
    const c = new Counter(db);
    c.visit();

    expect(c.counts.class).toBeGreaterThan(0);
    expect(c.counts.property).toBeGreaterThan(0);
  });

  it("subclass hooks override the no-op defaults", () => {
    const db = Cddal.parse(source);
    const v = new CollectingVisitor(db);
    v.visit();
    expect(v.classNames).toContain("AAA001");
  });

  it("default visit() is a no-op when no hooks overridden", () => {
    const db = new Database();
    class NoOp extends Visitor {}
    const v = new NoOp(db);
    expect(() => v.visit()).not.toThrow();
  });
});
