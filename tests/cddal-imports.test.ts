import { describe, expect, it } from "vitest";
import { Cddal, InMemoryFetcher, Resolver, ImportError } from "../src";

const BASE_DICT = `
meta-class MDC_C002 {
  code
  preferred_name
  superclass
  class_type
  applicable_properties
}
instance Boat < MDC_C002 {
  code: AAA010
  preferred_name.en: "Boat"
  superclass: UNIVERSE
  class_type: ITEM_CLASS
}
instance hull_length < MDC_C003 {
  code: AAAP010
  preferred_name.en: "hull length"
}
`;

describe("CDDAL module system", () => {
  it("bare import merges declarations from a relative path", () => {
    const fetcher = new InMemoryFetcher({
      "/main.cddal": `import "./base.cddal"

instance Speedboat < MDC_C002 {
  code: AAA011
  preferred_name.en: "Speedboat"
  superclass: Boat
  class_type: ITEM_CLASS
}`,
      "/base.cddal": BASE_DICT,
    });
    const resolver = new Resolver({ fetcher, basePath: "/" });

    const db = Cddal.parse(fetcher.fetch("/main.cddal")!, {
      resolver,
      sourceFile: "/main.cddal",
    });

    expect(
      db
        .classes()
        .map((c) => c.code)
        .sort(),
    ).toEqual(["AAA010", "AAA011"]);
    const speedboat = db.findByCode("AAA011");
    expect(speedboat).not.toBeNull();
  });

  it("is idempotent when a transitive import appears twice", () => {
    const fetcher = new InMemoryFetcher({
      "/main.cddal": `import "./left.cddal"
import "./right.cddal"
`,
      "/base.cddal": BASE_DICT,
      "/left.cddal": `import "./base.cddal"
instance LeftBoat < MDC_C002 {
  code: AAA020
  preferred_name.en: "Left Boat"
  class_type: ITEM_CLASS
}`,
      "/right.cddal": `import "./base.cddal"
instance RightBoat < MDC_C002 {
  code: AAA030
  preferred_name.en: "Right Boat"
  class_type: ITEM_CLASS
}`,
    });
    const resolver = new Resolver({ fetcher, basePath: "/" });

    const db = Cddal.parse(fetcher.fetch("/main.cddal")!, {
      resolver,
      sourceFile: "/main.cddal",
    });

    expect(db.findAllByCode("AAA010").length).toBe(1);
    expect(db.findByCode("AAA020")).not.toBeNull();
    expect(db.findByCode("AAA030")).not.toBeNull();
  });

  it("qualified import brings entities into the parent DB for IRDI resolution", () => {
    const fetcher = new InMemoryFetcher({
      "/main.cddal": `import "./base.cddal" as lib

instance Speedboat < MDC_C002 {
  code: AAA011
  preferred_name.en: "Speedboat"
  superclass: Boat
  class_type: ITEM_CLASS
}`,
      "/base.cddal": BASE_DICT,
    });
    const resolver = new Resolver({ fetcher, basePath: "/" });

    const db = Cddal.parse(fetcher.fetch("/main.cddal")!, {
      resolver,
      sourceFile: "/main.cddal",
    });

    const boat = db.findByCode("AAA010");
    expect(boat).not.toBeNull();
    expect(boat?.preferredName("en")).toBe("Boat");
  });

  it("selective import loads named declarations and supports renaming via 'as'", () => {
    const fetcher = new InMemoryFetcher({
      "/main.cddal": `from "./base.cddal" import { Boat as B }

instance Speedboat < MDC_C002 {
  code: AAA011
  preferred_name.en: "Speedboat"
  superclass: B
  class_type: ITEM_CLASS
}`,
      "/base.cddal": BASE_DICT,
    });
    const resolver = new Resolver({ fetcher, basePath: "/" });

    const db = Cddal.parse(fetcher.fetch("/main.cddal")!, {
      resolver,
      sourceFile: "/main.cddal",
    });

    expect(db.classes().length).toBe(2);
    const speedboat = db.findByCode("AAA011");
    expect(speedboat).not.toBeNull();
  });

  it("raises ImportError on circular imports", () => {
    const fetcher = new InMemoryFetcher({
      "/main.cddal": `import "./a.cddal"`,
      "/a.cddal": `import "./b.cddal"
instance A < MDC_C002 {
  code: AAA001
  preferred_name.en: "A"
  class_type: ITEM_CLASS
}`,
      "/b.cddal": `import "./a.cddal"
instance B < MDC_C002 {
  code: AAA002
  preferred_name.en: "B"
  class_type: ITEM_CLASS
}`,
    });
    const resolver = new Resolver({ fetcher, basePath: "/" });

    expect(() =>
      Cddal.parse(fetcher.fetch("/main.cddal")!, {
        resolver,
        sourceFile: "/main.cddal",
      }),
    ).toThrow(ImportError);
  });

  it("uses the in-memory fetcher for URL imports", () => {
    const fetcher = new InMemoryFetcher({
      "https://example.test/base.cddal": BASE_DICT,
    });
    const resolver = new Resolver({ fetcher });

    const main = `import "https://example.test/base.cddal"

instance Speedboat < MDC_C002 {
  code: AAA011
  preferred_name.en: "Speedboat"
  superclass: Boat
  class_type: ITEM_CLASS
}`;

    const db = Cddal.parse(main, { resolver, sourceFile: "(main)" });
    expect(db.findByCode("AAA010")).not.toBeNull();
  });

  it("skips unreachable URLs in non-strict mode", () => {
    const fetcher = new InMemoryFetcher({});
    const resolver = new Resolver({ fetcher, quiet: true });

    const main = `import "https://invalid.example/missing.cddal"

instance Local < MDC_C002 {
  code: AAA099
  preferred_name.en: "Local"
  class_type: ITEM_CLASS
}`;

    const db = Cddal.parse(main, { resolver, sourceFile: "(main)" });
    expect(db.findByCode("AAA099")).not.toBeNull();
  });

  it("raises ImportError in strict mode when a path cannot be resolved", () => {
    const fetcher = new InMemoryFetcher({});
    const resolver = new Resolver({ fetcher, strict: true });

    expect(() =>
      Cddal.parse('import "./does-not-exist.cddal"', {
        resolver,
        sourceFile: "(main)",
      }),
    ).toThrow(ImportError);
  });

  it("attaches source location to every entity", () => {
    const fetcher = new InMemoryFetcher({
      "/main.cddal": BASE_DICT,
    });
    const resolver = new Resolver({ fetcher, basePath: "/" });

    const db = Cddal.parse(fetcher.fetch("/main.cddal")!, {
      resolver,
      sourceFile: "/main.cddal",
    });

    const boat = db.findByCode("AAA010");
    expect(boat?.sourceLocation).not.toBeNull();
    expect(boat?.sourceLocation?.file).toBe("/main.cddal");
  });

  it("accepts 'as' as a property value (soft keyword regression)", () => {
    const cddal = `
instance Attosecond < MDC_C009 {
  code: UAC696
  preferred_name.en: "attosecond"
  short_name.en: as
}`;
    const db = Cddal.parse(cddal);
    const unit = db.findByCode("UAC696");
    expect(unit?.shortName("en")).toBe("as");
  });
});
