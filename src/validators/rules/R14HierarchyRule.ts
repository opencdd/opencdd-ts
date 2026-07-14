/**
 * R14 Hierarchy — class and composition hierarchies must be acyclic.
 *
 * Ported from Cdd::Validator::HierarchyRule (lib/cdd/validator/hierarchy_rule.rb).
 * Unlike other rules, this is a database-level invariant checked once after
 * every entity has been visited — it does not apply per-property. The
 * Runner invokes `classHierarchyAcyclic(database)` and
 * `compositionHierarchyAcyclic(database)` once each, and appends a single
 * R14 error if either cycle is found.
 */

import type { Rule, ValidationContext } from "../Rule";
import type { Database } from "../../models/Database";
import { Klass } from "../../models/Klass";
import { CompositionTree } from "../../models/CompositionTree";

export class R14HierarchyRule implements Rule {
  readonly ruleId = "R14";

  applies(_ctx: ValidationContext): boolean {
    return false;
  }

  call(_value: unknown, _ctx: ValidationContext): boolean {
    return true;
  }

  message(): string {
    return "R14: class or composition hierarchy contains a cycle";
  }
}

export function classHierarchyAcyclic(database: Database): boolean {
  for (const klass of database.classes()) {
    if (hasCycleFrom(klass, database, [])) return false;
  }
  return true;
}

export function compositionHierarchyAcyclic(database: Database): boolean {
  const tree = new CompositionTree(database);
  for (const klass of database.classes()) {
    if (hasCompositionCycle(klass, tree)) return false;
  }
  return true;
}

function hasCycleFrom(
  klass: Klass | null,
  database: Database,
  seen: string[],
): boolean {
  if (klass === null) return false;
  const code = klass.code;
  if (code && seen.includes(code)) return true;
  if (!code) return false;
  const parentIrdi = klass.parentIrdi;
  if (!parentIrdi) return false;
  const parent =
    database.find(parentIrdi) ?? database.findByCode(parentIrdi.code);
  if (!(parent instanceof Klass)) return false;
  return hasCycleFrom(parent, database, [...seen, code]);
}

function hasCompositionCycle(klass: Klass, tree: CompositionTree): boolean {
  try {
    tree.for(klass, 50);
    return false;
  } catch {
    return true;
  }
}
