import { describe, expect, it } from "vitest";
import {
  Database,
  DetClassification,
  Visitor,
  isDetClassificationNode,
  type DetClassificationNode,
  type EntityNode,
} from "../src";
import {
  REGISTRY,
  entry,
  MDC_C0101,
} from "../src/models/MetaClasses.generated";
import { entityConstructorFor } from "../src";

const MDC_C0101_ = "MDC_C0101";

describe("DetClassification entity", () => {
  it("registers MDC_C0101 in the REGISTRY", () => {
    expect(MDC_C0101).toBe("MDC_C0101");
    expect(entry(MDC_C0101)?.entityType).toBe("det_classification");
    expect(entry(MDC_C0101)?.codePropertyId).toBe("MDC_P001_5");
    expect(REGISTRY[MDC_C0101]?.name).toBe("DetClassification");
  });

  it("constructs via Entity.create with MDC_C0101 meta-class", () => {
    const det = DetClassification.create({
      irdi: "0112/2///IECCDD_001#A11",
      properties: { "MDC_P004.en": "DET classification 11" },
      metaClassIrdi: MDC_C0101_,
    });
    expect(det).toBeInstanceOf(DetClassification);
    expect(det.type).toBe("det_classification");
    expect(det.preferredName("en")).toBe("DET classification 11");
    expect(det.metaClassIrdi).toBe(MDC_C0101_);
  });

  it("resolves to DetClassification constructor via ENTITY_CONSTRUCTORS", () => {
    expect(entityConstructorFor(MDC_C0101_)).toBe(DetClassification);
  });
});

describe("Database.detClassifications accessor", () => {
  function makeDb(): Database {
    const db = new Database();
    const det = DetClassification.create({
      irdi: "0112/2///IECCDD_001#A11",
      properties: { "MDC_P004.en": "DET classification 11" },
      metaClassIrdi: MDC_C0101_,
    });
    db.addEntity(det);
    return db;
  }

  it("returns DetClassification entities by meta-class type", () => {
    const db = makeDb();
    expect(db.detClassifications()).toHaveLength(1);
    expect(db.detClassifications()[0]).toBeInstanceOf(DetClassification);
    expect(db.detClassifications()[0]?.preferredName("en")).toBe(
      "DET classification 11",
    );
  });

  it("does not bleed into entitiesOfType('view_control') or others", () => {
    const db = makeDb();
    expect(db.viewControls()).toHaveLength(0);
    expect(db.classes()).toHaveLength(0);
    expect(db.entitiesOfType("det_classification")).toHaveLength(1);
  });
});

describe("Visitor.visitDetClassification hook", () => {
  it("is invoked when walking the database", () => {
    const db = new Database();
    db.addEntity(
      DetClassification.create({
        irdi: "0112/2///IECCDD_001#A11",
        properties: { "MDC_P004.en": "DET 11" },
        metaClassIrdi: MDC_C0101_,
      }),
    );

    const visited: string[] = [];
    class Collector extends Visitor {
      visitDetClassification(det: DetClassification): void {
        visited.push(det.preferredName("en") ?? "");
      }
    }
    new Collector(db).visit();
    expect(visited).toEqual(["DET 11"]);
  });
});

describe("DetClassificationNode wire shape", () => {
  it("narrows via isDetClassificationNode", () => {
    const node: EntityNode = {
      type: "det_classification",
      irdi: "0112/2///IECCDD_001#A11",
      code: "A11",
      preferred_name: "DET classification 11",
    };
    expect(isDetClassificationNode(node)).toBe(true);
    if (isDetClassificationNode(node)) {
      const det: DetClassificationNode = node;
      expect(det.code).toBe("A11");
    }
  });

  it("rejects nodes of other types", () => {
    const node: EntityNode = {
      type: "view_control",
      irdi: "0112/2///61360_4#AAA001",
    };
    expect(isDetClassificationNode(node)).toBe(false);
  });
});
