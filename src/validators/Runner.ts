/**
 * Runner — applies every applicable rule to every property of every entity.
 *
 * Ported from Cdd::Validator::Runner (lib/cdd/validator/runner.rb). Iterates
 * entity → property → applicable rule, collecting failures. Two rule
 * groups:
 *
 *   - SELF_CONTAINED_RULES — need only the entity under test (R01, R03–R09,
 *     R11, R12).
 *   - DATABASE_RULES — need the in-memory Database (R02 Uniqueness,
 *     R08 Reference, R10 Synonym). Skipped automatically when no database
 *     is supplied to the Runner.
 *
 * R14 Hierarchy is a database-level invariant (cycle check), not per
 * property. It runs once after entity iteration when a database is present.
 */

import type { Entity } from "../models/Entity";
import type { Database } from "../models/Database";
import { Property } from "../models/Property";
import { ClassReference } from "../models/DataType";
import { REGISTRY } from "../models/PropertyIds.generated";
import * as Pids from "../models/PropertyIds.generated";
import type { Rule, ValidationContext, ValidationError } from "./Rule";
import { validationError } from "./Rule";
import { R01IrdiRule } from "./rules/R01IrdiRule";
import { R02UniquenessRule } from "./rules/R02UniquenessRule";
import { R03TypeRule } from "./rules/R03TypeRule";
import { R04EnumRule } from "./rules/R04EnumRule";
import { R05FormatRule } from "./rules/R05FormatRule";
import { R06PatternRule } from "./rules/R06PatternRule";
import { R07MandatoryRule } from "./rules/R07MandatoryRule";
import { R08ReferenceRule } from "./rules/R08ReferenceRule";
import { R09SetRule } from "./rules/R09SetRule";
import { R10SynonymRule } from "./rules/R10SynonymRule";
import { R11ConditionRule } from "./rules/R11ConditionRule";
import { R12DataTypeRule } from "./rules/R12DataTypeRule";
import {
  R14HierarchyRule,
  classHierarchyAcyclic,
  compositionHierarchyAcyclic,
} from "./rules/R14HierarchyRule";
import { R16ClassReferenceRule } from "./rules/R16ClassReferenceRule";

export interface RunnerDeps {
  readonly entities: readonly Entity[];
  readonly database?: Database;
  readonly enumTermsResolver?: (dataType: string) => readonly string[];
}

export const SELF_CONTAINED_RULES: readonly Rule[] = [
  new R01IrdiRule(),
  new R03TypeRule(),
  new R04EnumRule(),
  new R05FormatRule(),
  new R06PatternRule(),
  new R07MandatoryRule(),
  new R09SetRule(),
  new R11ConditionRule(),
  new R12DataTypeRule(),
];

export const DATABASE_RULES: readonly Rule[] = [
  new R02UniquenessRule(),
  new R08ReferenceRule(),
  new R10SynonymRule(),
  new R16ClassReferenceRule(),
];

export const HIERARCHY_RULE = new R14HierarchyRule();

export function allRules(): readonly Rule[] {
  return [...SELF_CONTAINED_RULES, ...DATABASE_RULES, HIERARCHY_RULE];
}

export function runValidation(
  deps: RunnerDeps,
  rules: readonly Rule[] = defaultRules(deps),
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const entity of deps.entities) {
    validateEntity(entity, deps, rules, errors);
  }
  if (deps.database) {
    if (
      !classHierarchyAcyclic(deps.database) ||
      !compositionHierarchyAcyclic(deps.database)
    ) {
      errors.push(
        validationError({
          sheet: null,
          row: null,
          column: null,
          rule: HIERARCHY_RULE.ruleId,
          message: HIERARCHY_RULE.message(),
        }),
      );
    }
  }
  return errors;
}

export function validateEntity(
  entity: Entity,
  deps: RunnerDeps,
  rules: readonly Rule[],
  errors: ValidationError[],
): void {
  entity.eachProperty((rawKey, value) => {
    if (rawKey === "__row_index__") return;
    const base = rawKey.split(".")[0];
    const entry = REGISTRY[base];
    const ctx: ValidationContext = {
      columnIri: base,
      valueKind: entry?.valueKind,
      dataType: derivedDataType(entity, base),
      enumTermsResolver: deps.enumTermsResolver,
      database: deps.database,
      entityType: entity.type,
    };
    for (const rule of rules) {
      if (!rule.applies(ctx)) continue;
      if (rule.call(value, ctx)) continue;
      errors.push(
        validationError({
          sheet: entity.metaClassIrdi ?? null,
          row: entity.irdi?.toString() ?? null,
          column: base,
          rule: rule.ruleId,
          message: rule.message(value, ctx),
        }),
      );
    }
  });
}

function defaultRules(deps: RunnerDeps): readonly Rule[] {
  return deps.database
    ? [...SELF_CONTAINED_RULES, ...DATABASE_RULES]
    : SELF_CONTAINED_RULES;
}

function derivedDataType(entity: Entity, base: string): string | undefined {
  if (!(entity instanceof Property)) return undefined;
  if (base === Pids.MDC_P022) return entity.dataTypeRaw;
  // For CLASS_REFERENCE properties, propagate the data_type to the
  // definition_class column so R16 can validate categorical instances.
  if (
    base === Pids.MDC_P021 &&
    entity.dataTypeParsed instanceof ClassReference
  ) {
    return entity.dataTypeRaw;
  }
  return undefined;
}
