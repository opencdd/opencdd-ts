/**
 * R10 Synonym — synonymous-name literals must be well-formed tuple sets.
 *
 * Ported from Cdd::Validator::SynonymRule (lib/cdd/validator/synonym_rule.rb).
 * Applies to MDC_P004_2 (synonymous_names) and MDC_P007 (synonym). A well-formed
 * value is either empty or a brace-enclosed set of tuples, e.g.
 * `{ (en, "Foo"), (fr, "Bar") }`. Each tuple must begin with `(`.
 */

import type { Rule, ValidationContext } from "../Rule";
import * as Pids from "../../models/PropertyIds.generated";
import { isEmpty, rubyInspect } from "./shared";

export class R10SynonymRule implements Rule {
  readonly ruleId = "R10";

  applies(ctx: ValidationContext): boolean {
    return ctx.columnIri === Pids.MDC_P004_2 || ctx.columnIri === Pids.MDC_P007;
  }

  call(value: unknown): boolean {
    if (isEmpty(value)) return true;
    const s = String(value).trim();
    if (!s.startsWith("{") || !s.endsWith("}")) return false;
    const body = s.slice(1, -1).trim();
    if (body.length === 0) return true;
    const tuples = body
      .split(/\)\s*,\s*/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    return tuples.every((t) => t.startsWith("("));
  }

  message(value: unknown): string {
    return `R10: synonymous-name literal ${rubyInspect(value)} is not well-formed`;
  }
}
