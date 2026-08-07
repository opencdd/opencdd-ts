import { describe, expect, it } from "vitest";
import type {
  PropertyMetadata,
  PropertyMetadataMap,
  MetaClassDefinition,
  MetaClassDefinitionMap,
} from "../src";

describe("PropertyMetadata wire shape", () => {
  it("accepts a minimal entry (name only)", () => {
    const meta: PropertyMetadata = { name: "preferred name" };
    expect(meta.name).toBe("preferred name");
  });

  it("accepts a fully populated entry", () => {
    const meta: PropertyMetadata = {
      name: "UN/ECE code",
      datatype: "STRING_TYPE",
      multilingual: false,
      valueFormat: "M..255",
    };
    expect(meta).toEqual({
      name: "UN/ECE code",
      datatype: "STRING_TYPE",
      multilingual: false,
      valueFormat: "M..255",
    });
  });

  it("supports multilingual flag for TRANSLATABLE_STRING_TYPE", () => {
    const meta: PropertyMetadata = {
      name: "preferred name",
      datatype: "TRANSLATABLE_STRING_TYPE",
      multilingual: true,
    };
    expect(meta.multilingual).toBe(true);
  });
});

describe("PropertyMetadataMap", () => {
  it("looks up metadata by property code", () => {
    const map: PropertyMetadataMap = {
      MDC_P004: {
        name: "preferred name",
        datatype: "TRANSLATABLE_STRING_TYPE",
        multilingual: true,
      },
      MDC_P023: { name: "unit structure", datatype: "STRING_TYPE" },
      C0100: { name: "UN/ECE code", datatype: "STRING_TYPE" },
    };

    expect(map.MDC_P004?.name).toBe("preferred name");
    expect(map.MDC_P023?.datatype).toBe("STRING_TYPE");
    expect(map.C0100?.name).toBe("UN/ECE code");
    expect(map.MDC_P999).toBeUndefined();
  });

  it("drives labels from raw_properties without typed fields", () => {
    // Verifies the meta-driven approach: the renderer pulls the
    // label from the metadata map, not from a hard-coded field on
    // the entity.
    const rawProperties = {
      C0100: "AMP",
      C0105: "1.0",
    };
    const labels: PropertyMetadataMap = {
      C0100: { name: "UN/ECE code", datatype: "STRING_TYPE" },
      C0105: { name: "unit conversion", datatype: "STRING_TYPE" },
    };

    const rendered = Object.entries(rawProperties).map(([code, value]) => ({
      label: labels[code]?.name ?? code,
      value,
    }));
    expect(rendered).toEqual([
      { label: "UN/ECE code", value: "AMP" },
      { label: "unit conversion", value: "1.0" },
    ]);
  });
});

describe("MetaClassDefinition wire shape", () => {
  it("captures code, name, and allowed property ids", () => {
    const def: MetaClassDefinition = {
      code: "MDC_C009",
      name: "Unit",
      propertyIds: ["MDC_P001_10", "MDC_P002_1", "MDC_P002_2", "MDC_P004"],
    };
    expect(def.code).toBe("MDC_C009");
    expect(def.propertyIds).toContain("MDC_P004");
  });
});

describe("MetaClassDefinitionMap", () => {
  it("looks up meta-class definitions by code", () => {
    const defs: MetaClassDefinitionMap = {
      MDC_C009: {
        code: "MDC_C009",
        name: "Unit",
        propertyIds: ["MDC_P001_10", "MDC_P004"],
      },
      MDC_C003: {
        code: "MDC_C003",
        name: "Property",
        propertyIds: ["MDC_P004", "MDC_P022"],
      },
    };

    expect(defs.MDC_C009?.name).toBe("Unit");
    expect(defs.MDC_C003?.propertyIds).toContain("MDC_P022");
    expect(defs.MDC_C999).toBeUndefined();
  });

  it("can be combined with PropertyMetadataMap for full rendering", () => {
    // The complete pipeline: for any entity, determine its meta-class,
    // then for each allowed property id look up the label.
    const metaClasses: MetaClassDefinitionMap = {
      MDC_C009: {
        code: "MDC_C009",
        name: "Unit",
        propertyIds: ["MDC_P004", "MDC_P023"],
      },
    };
    const properties: PropertyMetadataMap = {
      MDC_P004: {
        name: "preferred name",
        datatype: "TRANSLATABLE_STRING_TYPE",
        multilingual: true,
      },
      MDC_P023: { name: "unit structure", datatype: "STRING_TYPE" },
    };

    const unitMeta = metaClasses.MDC_C009!;
    const labels = unitMeta.propertyIds.map(
      (id) => properties[id]?.name ?? id,
    );
    expect(labels).toEqual(["preferred name", "unit structure"]);
  });
});
