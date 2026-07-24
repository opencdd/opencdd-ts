/**
 * Condition — boolean predicate or class-reference set.
 *
 * Ported from Opencdd::Condition (lib/opencdd/condition.rb). Used by
 * validator rule R11 (well-formedness) and by the instance-rule editor.
 *
 * Two concrete forms, discriminated by `type`:
 *   - "expression":       `left op right` (op is == or !=; right may be a set)
 *   - "class_reference":  bare IRDI or set of IRDIs (IEC 62683 form); means
 *                         "applies when the host class is one of these IRDIs".
 */

const SET_PATTERN = /^\{(?<body>.*)\}$/s;
const EXPRESSION_PATTERN =
  /^(?<left>[^=!<>]+?)\s*(?<op>==|!=)\s*(?<right>.+)$/s;

export type ConditionOperator = "==" | "!=";

export type ConditionRhs = string | readonly string[];

export type ConditionType = ConditionExpression | ConditionClassReference;

export abstract class Condition {
  abstract readonly type: "expression" | "class_reference";

  abstract toString(): string;

  abstract equals(other: Condition): boolean;

  get isExpression(): boolean {
    return this.type === "expression";
  }

  get isClassReference(): boolean {
    return this.type === "class_reference";
  }

  static parse(raw: string | null | undefined): Condition | null {
    if (!raw) return null;
    const s = raw.trim();
    if (!s) return null;

    const ref = tryParseClassReference(s);
    if (ref) return ref;

    const m = s.match(EXPRESSION_PATTERN);
    if (!m || m.groups === undefined) {
      throw new ConditionSyntaxError(
        `invalid condition expression: ${JSON.stringify(s)}`,
      );
    }
    const left = m.groups.left.trim();
    const op = m.groups.op as ConditionOperator;
    const right = parseRhs(m.groups.right.trim());
    return new ConditionExpression(left, op, right);
  }

  static expression(
    left: string,
    operator: ConditionOperator,
    right: ConditionRhs,
  ): ConditionExpression {
    return new ConditionExpression(left.trim(), operator, right);
  }

  static classReference(irdis: readonly string[]): ConditionClassReference {
    return new ConditionClassReference(irdis);
  }
}

export class ConditionExpression extends Condition {
  readonly type = "expression" as const;

  constructor(
    readonly left: string,
    readonly operator: ConditionOperator,
    readonly right: ConditionRhs,
  ) {
    super();
    Object.freeze(this);
  }

  get set(): boolean {
    return Array.isArray(this.right);
  }

  satisfiedBy(bindings: Readonly<Record<string, unknown>>): boolean {
    const actual = bindings[this.left];
    if (actual === undefined || actual === null) return false;
    if (this.set) {
      const contained = (this.right as readonly string[]).some((r) =>
        matches(actual, r),
      );
      return this.operator === "==" ? contained : !contained;
    }
    const equal = matches(actual, this.right as string);
    return this.operator === "==" ? equal : !equal;
  }

  toString(): string {
    if (this.set) {
      const rhs = `{ ${(this.right as readonly string[]).join(", ")} }`;
      return `${this.left} ${this.operator} ${rhs}`;
    }
    const literal = this.right as string;
    const rhs = quotedLiteral(literal) ? `"${literal}"` : literal;
    return `${this.left} ${this.operator} ${rhs}`;
  }

  equals(other: Condition): boolean {
    if (!(other instanceof ConditionExpression)) return false;
    return (
      this.left === other.left &&
      this.operator === other.operator &&
      normalizeForEq(this.right) === normalizeForEq(other.right)
    );
  }
}

export class ConditionClassReference extends Condition {
  readonly type = "class_reference" as const;
  readonly irdis: readonly string[];

  constructor(irdis: readonly string[]) {
    super();
    const cleaned = irdis.map((i) => i.trim()).filter((i) => i.length > 0);
    this.irdis = Object.freeze(cleaned) as readonly string[];
    Object.freeze(this);
  }

  toString(): string {
    return this.irdis.length === 1
      ? this.irdis[0]!
      : `{${this.irdis.join(", ")}}`;
  }

  equals(other: Condition): boolean {
    if (!(other instanceof ConditionClassReference)) return false;
    if (this.irdis.length !== other.irdis.length) return false;
    const a = [...this.irdis].sort().join(" ");
    const b = [...other.irdis].sort().join(" ");
    return a === b;
  }
}

export class ConditionSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConditionSyntaxError";
  }
}

function tryParseClassReference(
  s: string,
): ConditionClassReference | null {
  if (s.startsWith("{") && s.endsWith("}")) {
    const body = s.slice(1, -1);
    const elements = body
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (elements.length === 0) return null;
    return new ConditionClassReference(elements);
  }
  if (s.includes("#") && !/[=\s]/.test(s)) {
    return new ConditionClassReference([s]);
  }
  return null;
}

function parseRhs(rhs: string): ConditionRhs {
  const setMatch = rhs.match(SET_PATTERN);
  if (setMatch && setMatch.groups !== undefined) {
    const elements = setMatch.groups.body
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return elements;
  }
  return unquote(rhs);
}

function unquote(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function matches(actual: unknown, expected: string): boolean {
  return String(actual) === expected;
}

function quotedLiteral(value: string): boolean {
  return (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  );
}

function normalizeForEq(value: ConditionRhs): string {
  if (Array.isArray(value)) return [...value].sort().join(" ");
  return value as string;
}
