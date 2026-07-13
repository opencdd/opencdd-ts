import { describe, expect, it } from "vitest";
import { Cddal, Database, IRDI, Klass } from "../src";

const FIXTURE = `# tiny CDDAL fixture
instance AAA001 < MDC_C002 {
  code: AAA001
  preferred_name.en: "Vehicle"
  class_type: ITEM_CLASS
}

instance AAAP001 < MDC_C003 {
  code: AAAP001
  preferred_name.en: "vehicle length"
  data_type: REAL_TYPE
  definition_class: AAA001
}
`;

describe("Cddal top-level API", () => {
  it("parses a small fixture into a finalized Database", () => {
    const db = Cddal.parse(FIXTURE);
    expect(db).toBeInstanceOf(Database);
    expect(db.classes().length).toBe(1);
    expect(db.properties().length).toBe(1);

    const klass = db.findByCode("AAA001") as Klass | null;
    expect(klass).not.toBeNull();
    expect(klass?.preferredName("en")).toBe("Vehicle");
  });

  it("merges into a caller-supplied database", () => {
    const seed = new Database();
    const existing = new Klass(
      IRDI.parse("0112/2///61360_4#BBB001"),
      { "MDC_P004.en": "Pre-existing" },
      "MDC_C002",
    );
    seed.addEntity(existing);

    Cddal.parse(FIXTURE, { database: seed });
    expect(seed.classes().length).toBe(2);
    expect(seed.findByCode("AAA001")).not.toBeNull();
    expect(seed.findByCode("BBB001")).not.toBeNull();
  });

  it("serializes a database back to CDDAL text", () => {
    const db = Cddal.parse(FIXTURE);
    const text = Cddal.serialize(db);
    expect(text).toContain("instance AAA001 < MDC_C002");
    expect(text).toContain("instance AAAP001 < MDC_C003");
  });

  it("round-trips parse → serialize → parse without throwing", () => {
    const db1 = Cddal.parse(FIXTURE);
    const text = Cddal.serialize(db1);
    const db2 = Cddal.parse(text);
    expect(db2.classes().length).toBe(1);
    expect(db2.properties().length).toBe(1);
  });
});
