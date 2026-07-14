import { Database } from "./Database";
import { Entity } from "./Entity";
import { Klass } from "./Klass";
import { Property } from "./Property";
import { IRDI } from "./IRDI";

export interface EffectivePropertiesResult {
  readonly properties: readonly Property[];
  readonly sources: ReadonlyMap<string, readonly Entity[]>;
}

export class EffectiveProperties {
  constructor(readonly database: Database) {}

  for(klass: Klass | IRDI | string): EffectivePropertiesResult {
    const resolved = this.resolveKlass(klass);
    if (resolved === null) return EMPTY_RESULT;
    const acc: Property[] = [];
    const sources = new Map<string, Entity[]>();
    this.accumulate(resolved, new Set<string>(), acc, sources);
    const deduped = dedupeByIrdi(acc);
    return { properties: deduped, sources };
  }

  codesFor(klass: Klass | IRDI | string): string[] {
    return this.for(klass)
      .properties.map((p) => p.code ?? "")
      .filter((c) => c.length > 0);
  }

  private resolveKlass(value: Klass | IRDI | string): Klass | null {
    if (value instanceof Klass) return value;
    const entity = this.database.resolveReference(
      value instanceof IRDI ? value.toString() : value,
    );
    return entity instanceof Klass ? entity : null;
  }

  private accumulate(
    klass: Klass,
    seen: Set<string>,
    acc: Property[],
    sources: Map<string, Entity[]>,
  ): void {
    const key = klass.irdi?.toString();
    if (key === undefined) return;
    if (seen.has(key)) return;
    seen.add(key);

    this.collect(klass.declaredPropertyIrdis, klass, acc, sources);
    this.collect(klass.applicablePropertyIrdis, klass, acc, sources);
    this.collect(klass.importedPropertyIrdis, klass, acc, sources);

    const parentRef = klass.parentIrdi ?? klass.superclassIrdi;
    if (parentRef !== null) {
      const parent = this.database.find(parentRef);
      if (parent instanceof Klass) this.accumulate(parent, seen, acc, sources);
    }

    for (const ref of klass.isCaseOfIrdis) {
      const target = this.database.find(ref);
      if (target instanceof Klass) this.accumulate(target, seen, acc, sources);
    }
  }

  private collect(
    irdis: readonly IRDI[],
    owner: Klass,
    acc: Property[],
    sources: Map<string, Entity[]>,
  ): void {
    for (const irdi of irdis) {
      const prop = this.database.find(irdi);
      if (!(prop instanceof Property)) continue;
      acc.push(prop);
      const key = prop.irdi?.toString();
      if (key === undefined) continue;
      const list = sources.get(key) ?? [];
      if (!list.includes(owner)) list.push(owner);
      sources.set(key, list);
    }
  }
}

const EMPTY_RESULT: EffectivePropertiesResult = {
  properties: [],
  sources: new Map(),
};

function dedupeByIrdi(properties: Property[]): Property[] {
  const seen = new Set<string>();
  const out: Property[] = [];
  for (const p of properties) {
    const key = p.irdi?.toString();
    if (key === undefined) {
      out.push(p);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
