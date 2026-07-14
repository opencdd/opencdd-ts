/**
 * AliasTable — mutable alias → property_id registry.
 *
 * Ported from Cdd::AliasTable (lib/cdd/alias_table.rb). Seeds itself
 * with the canonical aliases from the generated PropertyIds registry,
 * then accepts user declarations from `alias` statements in CDDAL
 * source.
 *
 * Resolution order: user declaration > seeded default.
 */

import { REGISTRY } from "./PropertyIds.generated";

const DEFAULT_ALIAS_MAP: Readonly<Record<string, string>> = (() => {
  const out: Record<string, string> = {};
  for (const [id, entry] of Object.entries(REGISTRY)) {
    for (const alias of entry.aliases) {
      const prior = out[alias];
      if (prior !== undefined && prior !== id) {
        console.warn(
          `AliasTable: alias "${alias}" claimed by both ${prior} and ${id}; keeping ${prior}`,
        );
        continue;
      }
      out[alias] = id;
    }
    if (!(id in out)) out[id] = id;
  }
  return out;
})();

export class AliasTable {
  private readonly table: Map<string, string>;

  constructor(defaults = true) {
    this.table = defaults
      ? new Map(Object.entries(DEFAULT_ALIAS_MAP))
      : new Map();
  }

  declare(aliasName: string, propertyId: string): this {
    const existing = this.table.get(aliasName);
    if (existing !== undefined) {
      if (existing === propertyId) return this;
      throw new AliasTableError(`duplicate alias: ${aliasName}`);
    }
    if (!REGISTRY[propertyId]) {
      throw new AliasTableError(`unknown property id: ${propertyId}`);
    }
    this.table.set(aliasName, propertyId);
    return this;
  }

  redeclare(aliasName: string, propertyId: string): this {
    if (!REGISTRY[propertyId]) {
      throw new AliasTableError(`unknown property id: ${propertyId}`);
    }
    this.table.set(aliasName, propertyId);
    return this;
  }

  resolve(name: string): string | undefined {
    return this.table.get(name);
  }

  has(name: string): boolean {
    return this.table.has(name);
  }

  each(callback: (aliasName: string, propertyId: string) => void): void {
    this.table.forEach((propertyId, aliasName) =>
      callback(aliasName, propertyId),
    );
  }

  toRecord(): Record<string, string> {
    return Object.fromEntries(this.table);
  }

  get size(): number {
    return this.table.size;
  }
}

export class AliasTableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AliasTableError";
  }
}
