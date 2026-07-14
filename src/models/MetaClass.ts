/**
 * MetaClass — thin OOP facade over the generated MetaClasses registry.
 *
 * Ported from Cdd::MetaClass (lib/cdd/meta_class.rb). The Ruby side has
 * two layers: an instance class (a single meta-class entry) and a
 * registry module (MetaClasses). In TypeScript the generated file
 * already exposes the data and lookup helpers, so this module just
 * wraps them in the instance-style API that callers (Builder, future
 * tree walkers) expect.
 *
 * Single source of truth: `MetaClasses.generated.ts` is emitted by
 * `Cdd::Codegen::Ts` from the Ruby `Cdd::MetaClasses` registry. Do
 * not edit the data here.
 */

import {
  REGISTRY,
  type EntityType,
  type MetaClassEntry,
} from "./MetaClasses.generated";

export interface MetaClass {
  readonly irdi: string;
  readonly name: string;
  readonly entityType: EntityType;
  readonly codePropertyId: string;
  readonly allowedPropertyIds: readonly string[];
}

export function forIrdi(irdi: string): MetaClass | undefined {
  return REGISTRY[irdi];
}

export function all(): readonly MetaClass[] {
  return Object.values(REGISTRY);
}

export function codes(): readonly string[] {
  return Object.keys(REGISTRY);
}

export function allowsProperty(
  metaClassIrdi: string,
  propertyId: string,
): boolean {
  return (
    REGISTRY[metaClassIrdi]?.allowedPropertyIds.includes(propertyId) ?? false
  );
}

export function allowsPropertyEntry(
  meta: MetaClassEntry,
  propertyId: string,
): boolean {
  return meta.allowedPropertyIds.includes(propertyId);
}
