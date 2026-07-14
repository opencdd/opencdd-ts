/**
 * Rule — validation predicate interface.
 *
 * Ported from Cdd::Validator::Rule (lib/cdd/validator/rule.rb). Each
 * concrete rule lives in its own file (open/closed: adding a rule
 * means adding a file, not editing a switch).
 */

import type { ValueKind } from "../models/PropertyIds.generated";
import type { Database } from "../models/Database";
import type { EntityType } from "../models/MetaClasses.generated";

export interface ValidationContext {
  readonly columnIri: string;
  readonly valueKind?: ValueKind;
  readonly dataType?: string;
  readonly valueFormat?: string;
  readonly pattern?: string;
  readonly requirement?: string;
  readonly enumTermsResolver?: (dataType: string) => readonly string[];
  readonly database?: Database;
  readonly entityType?: EntityType;
}

export interface Rule {
  readonly ruleId: string;
  applies(ctx: ValidationContext): boolean;
  call(value: unknown, ctx: ValidationContext): boolean;
  message(value: unknown, ctx: ValidationContext): string;
}

export interface ValidationError {
  readonly sheet: string | null;
  readonly row: string | null;
  readonly column: string | null;
  readonly rule: string;
  readonly message: string;
}

export function validationError(
  partial: Omit<ValidationError, "sheet" | "row" | "column"> & {
    sheet?: string | null;
    row?: string | null;
    column?: string | null;
  },
): ValidationError {
  return Object.freeze({
    sheet: partial.sheet ?? null,
    row: partial.row ?? null,
    column: partial.column ?? null,
    rule: partial.rule,
    message: partial.message,
  });
}
