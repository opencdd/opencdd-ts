import type { Rule, ValidationContext } from "../Rule";
import { isEmpty, rubyInspect } from "./shared";

const TOKEN_PATTERN =
  /^(?<type>NR1|NR2|NR3|M|B|Date|DT|Bool)(?:\s+(?<sign>S|U))?(?:\.\.(?<width>\d+))?(?:\.(?<decimals>\d+))?$/;

export class R05FormatRule implements Rule {
  readonly ruleId = "R05";

  applies(ctx: ValidationContext): boolean {
    return ctx.valueFormat !== undefined && ctx.valueFormat.trim().length > 0;
  }

  call(value: unknown, ctx: ValidationContext): boolean {
    if (isEmpty(value)) return true;
    const match = (ctx.valueFormat ?? "").trim().match(TOKEN_PATTERN);
    if (!match || match.groups === undefined) return false;
    return typeCheck(value, match.groups as { type: string; width?: string });
  }

  message(value: unknown, ctx: ValidationContext): string {
    return `R05: ${rubyInspect(value)} does not match value format ${ctx.valueFormat}`;
  }
}

function typeCheck(
  value: unknown,
  groups: { type: string; width?: string },
): boolean {
  const width = groups.width ? parseInt(groups.width, 10) : undefined;
  const s = String(value);
  switch (groups.type) {
    case "NR1":
      return Number.isInteger(Number(s));
    case "NR2":
    case "NR3":
      return !Number.isNaN(parseFloat(s));
    case "M":
      return s.length <= (width ?? 255);
    case "B":
      return /^[01]+$/.test(s) && s.length <= (width ?? 8);
    case "Date":
      return (
        !Number.isNaN(new Date(s).getTime()) && /^\d{4}-\d{2}-\d{2}/.test(s)
      );
    case "DT":
      return !Number.isNaN(new Date(s).getTime());
    case "Bool":
      return ["true", "false"].includes(s.toLowerCase());
    default:
      return false;
  }
}
