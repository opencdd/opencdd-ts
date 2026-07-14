import type { Rule, ValidationContext } from "../Rule";
import * as Pids from "../../models/PropertyIds.generated";
import { IRDI } from "../../models/IRDI";
import { isEmpty, rubyInspect } from "./shared";

const FULL_PATTERN =
  /^[^/#\s]+\/[^/#\s]*\/\/\/[^/#\s]+#[^#\s]+(?:##\d+)?(?:###[^#]+)?$/;
const SHORT_PATTERN = /^[A-Za-z0-9_]+$/;

export class R01IrdiRule implements Rule {
  readonly ruleId = "R01";

  applies(ctx: ValidationContext): boolean {
    return isCodeColumn(ctx) || isReferenceColumn(ctx);
  }

  call(value: unknown, ctx: ValidationContext): boolean {
    if (isEmpty(value)) return true;
    const s = String(value).trim();
    if (isReferenceColumn(ctx)) {
      return IRDI.parse(s) !== null;
    }
    return FULL_PATTERN.test(s) || SHORT_PATTERN.test(s);
  }

  message(value: unknown, _ctx: ValidationContext): string {
    return `R01: malformed IRDI/ICID ${rubyInspect(value)}`;
  }
}

function isCodeColumn(ctx: ValidationContext): boolean {
  return (
    ctx.columnIri.startsWith(Pids.MDC_P001) || ctx.columnIri === Pids.EXT_P001
  );
}

function isReferenceColumn(ctx: ValidationContext): boolean {
  return (
    ctx.valueKind === "identifier_ref" ||
    ctx.valueKind === "set_of_refs" ||
    ctx.valueKind === "class_ref"
  );
}
