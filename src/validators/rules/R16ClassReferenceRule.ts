/**
 * R16 CLASS_REFERENCE — powertype-target validation.
 *
 * Ported from Opencdd::Validator::ClassReferenceRule
 * (lib/opencdd/validator/class_reference_rule.rb).
 *
 * When a property's data_type is `CLASS_REFERENCE(CategoricalClass)`,
 * each value IRDI must resolve to a categorical instance of that
 * class. Plain reference resolution (R08) doesn't catch the
 * categorical constraint — only R16 closes the loop on CDD's
 * powertype semantics.
 *
 * Example: `engine_type: CLASS_REFERENCE(EngineType)` with value
 * "AAA001" (Vehicle) should fail — Vehicle is not a categorical
 * instance of EngineType.
 *
 * Skipped automatically when no database is supplied (no way to
 * resolve the categorical class).
 */

import type { Rule, ValidationContext } from "../Rule";
import { ClassReference, DataType } from "../../models/DataType";
import { IRDI } from "../../models/IRDI";
import { isEmpty, rubyInspect } from "./shared";

export class R16ClassReferenceRule implements Rule {
  readonly ruleId = "R16";

  applies(ctx: ValidationContext): boolean {
    if (!ctx.database) return false;
    return parseClassReference(ctx.dataType) !== null;
  }

  call(value: unknown, ctx: ValidationContext): boolean {
    if (isEmpty(value)) return true;
    const target = this.categoricalTarget(ctx);
    if (!target) return true;
    const db = ctx.database!;
    return referenceTokens(String(value)).every((ref) =>
      db.validClassReference(target, ref),
    );
  }

  message(value: unknown, ctx: ValidationContext): string {
    const dt = parseClassReference(ctx.dataType);
    const name = dt?.classIdentifier ?? "<unresolved>";
    return `R16: CLASS_REFERENCE(${name}) value ${rubyInspect(value)} is not a valid powertype instance`;
  }

  private categoricalTarget(ctx: ValidationContext): string | null {
    const dt = parseClassReference(ctx.dataType);
    if (!dt) return null;
    return dt.classIdentifier;
  }
}

function parseClassReference(raw: string | undefined): ClassReference | null {
  if (!raw) return null;
  const parsed = DataType.parseOrString(raw);
  return parsed instanceof ClassReference ? parsed : null;
}

function referenceTokens(raw: string): string[] {
  const s = raw.trim();
  const unwrapped = unwrapDelimiters(s);
  return unwrapped
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .filter((t) => !/[()]/.test(t));
}

function unwrapDelimiters(s: string): string {
  if (s.startsWith("{") && s.endsWith("}")) return s.slice(1, -1);
  if (s.startsWith("(") && s.endsWith(")")) return s.slice(1, -1);
  return s;
}
