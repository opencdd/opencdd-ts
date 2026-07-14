/**
 * R02 Uniqueness — code values must be unique within their sheet.
 *
 * Ported from Cdd::Validator::UniquenessRule (lib/cdd/validator/uniqueness_rule.rb).
 * Applies to every code-property column (MDC_P001_* and EXT_P001). For each
 * value, counts how many peer entities of the same type share it; passes
 * only when the count is exactly one.
 */

import type { Rule, ValidationContext } from "../Rule";
import * as Pids from "../../models/PropertyIds.generated";
import { isEmpty, rubyInspect } from "./shared";

export class R02UniquenessRule implements Rule {
  readonly ruleId = "R02";

  applies(ctx: ValidationContext): boolean {
    return (
      isCodeColumn(ctx) &&
      ctx.database !== undefined &&
      ctx.entityType !== undefined
    );
  }

  call(value: unknown, ctx: ValidationContext): boolean {
    if (isEmpty(value)) return true;
    const db = ctx.database;
    const type = ctx.entityType;
    if (!db || !type) return true;
    const s = String(value).trim();
    if (s.length === 0) return true;
    const peers = db.entitiesOfType(type).filter((e) => e.code !== undefined);
    const count = peers.filter((e) => (e.code ?? "") === s).length;
    return count === 1;
  }

  message(value: unknown): string {
    return `R02: code ${rubyInspect(value)} is not unique within its sheet`;
  }
}

function isCodeColumn(ctx: ValidationContext): boolean {
  return (
    ctx.columnIri.startsWith(Pids.MDC_P001) || ctx.columnIri === Pids.EXT_P001
  );
}
