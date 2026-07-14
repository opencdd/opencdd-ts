import type { Rule, ValidationContext } from "../Rule";
import { IRDI } from "../../models/IRDI";
import { isEmpty, rubyInspect } from "./shared";

type Predicate = (value: unknown) => boolean;

const SIMPLE_PREDICATES: Readonly<Record<string, Predicate>> = {
  BOOLEAN_TYPE: (v) =>
    ["true", "false"].includes(String(v).toLowerCase().trim()),
  STRING_TYPE: (v) => typeof v === "string" || v !== null,
  TRANSLATABLE_STRING_TYPE: (v) =>
    typeof v === "string" || isStructuredPairs(v),
  IRDI_TYPE: (v) => IRDI.parse(String(v)) !== null,
  IRDI_STRING_TYPE: (v) => IRDI.parse(String(v)) !== null,
  ICID_STRING: (v) => IRDI.parse(String(v)) !== null,
  ICID_STRING_TYPE: (v) => IRDI.parse(String(v)) !== null,
  DATE_TYPE: (v) => isDate(v),
  DATE_TIME_TYPE: (v) => isDateTime(v),
  DATETIME_TYPE: (v) => isDateTime(v),
  REAL_TYPE: (v) => isReal(v),
  INTEGER_TYPE: (v) => isInteger(v),
  INT_TYPE: (v) => isInteger(v),
  RATIONAL_TYPE: (v) => isRational(v),
};

export class R03TypeRule implements Rule {
  readonly ruleId = "R03";

  applies(ctx: ValidationContext): boolean {
    return ctx.dataType !== undefined && ctx.dataType.length > 0;
  }

  call(value: unknown, ctx: ValidationContext): boolean {
    if (isEmpty(value)) return true;
    const token = ctx.dataType ?? "";
    if (token.startsWith("ENUM_")) return enumMember(value, ctx);
    const predicate = SIMPLE_PREDICATES[token];
    if (!predicate) return true;
    return predicate(value);
  }

  message(value: unknown, ctx: ValidationContext): string {
    return `R03: value ${rubyInspect(value)} does not satisfy data type ${ctx.dataType}`;
  }
}

function enumMember(value: unknown, ctx: ValidationContext): boolean {
  if (!ctx.enumTermsResolver) return true;
  const terms = ctx.enumTermsResolver(ctx.dataType ?? "");
  if (terms.length === 0) return true;
  return terms.some((t) => String(t) === String(value));
}

function isStructuredPairs(value: unknown): boolean {
  const s = String(value).trim();
  return s.startsWith("{") || s.startsWith("(");
}

function isDate(value: unknown): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) return false;
  const date = new Date(String(value));
  return !Number.isNaN(date.getTime());
}

function isDateTime(value: unknown): boolean {
  const date = new Date(String(value));
  return !Number.isNaN(date.getTime());
}

function isReal(value: unknown): boolean {
  return !Number.isNaN(parseFloat(String(value)));
}

function isInteger(value: unknown): boolean {
  return Number.isInteger(Number(String(value)));
}

function isRational(value: unknown): boolean {
  const s = String(value).trim();
  if (/^-?\d+\/-?\d+$/.test(s)) {
    const [, denom] = s.split("/");
    return Number(denom) !== 0;
  }
  return isReal(value);
}
