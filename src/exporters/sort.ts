/**
 * Shared sort helpers for exporters. Mirrors the comparator Ruby uses in
 * `Cdd::Visitor#visit_database` (sort by code, ascending, locale-aware).
 */

import type { Entity } from "../models/Entity";

export function byEntityCode<T extends Entity>(a: T, b: T): number {
  return (a.code ?? "").localeCompare(b.code ?? "");
}

export function sortByEntityCode<T extends Entity>(
  entities: readonly T[],
): T[] {
  return [...entities].sort(byEntityCode);
}
