/**
 * Condition — boolean predicate expression of the form `left op right`.
 *
 * Ported from Cdd::Condition (lib/cdd/condition.rb). Used by validator
 * rule R11 (well-formedness) and by the instance-rule editor (Phase 3.10).
 *
 * The right-hand side may be either a single literal or a set of
 * literals written as `{ a, b, c }`.
 */

const SET_PATTERN = /^\{(?<body>.*)\}$/s;
const EXPRESSION_PATTERN =
  /^(?<left>[^=!<>]+?)\s*(?<op>==|!=)\s*(?<right>.+)$/s;

export type ConditionOperator = "==" | "!=";

export type ConditionRhs = string | readonly string[];

export class Condition {
  private constructor(
    readonly left: string,
    readonly operator: ConditionOperator,
    readonly right: ConditionRhs,
  ) {
    Object.freeze(this);
  }

  get set(): boolean {
    return Array.isArray(this.right);
  }

  satisfiedBy(bindings: Readonly<Record<string, unknown>>): boolean {
    const actual = bindings[this.left] ?? bindings[this.left];
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
    return (
      this.left === other.left &&
      this.operator === other.operator &&
      normalizeForEq(this.right) === normalizeForEq(other.right)
    );
  }

  static parse(raw: string | null | undefined): Condition | null {
    if (!raw) return null;
    const s = raw.trim();
    if (!s) return null;
    const m = s.match(EXPRESSION_PATTERN);
    if (!m || m.groups === undefined) {
      throw new ConditionSyntaxError(
        `invalid condition expression: ${JSON.stringify(s)}`,
      );
    }
    const left = m.groups.left.trim();
    const op = m.groups.op as ConditionOperator;
    const right = parseRhs(m.groups.right.trim());
    return new Condition(left, op, right);
  }

  static of(
    left: string,
    operator: ConditionOperator,
    right: ConditionRhs,
  ): Condition {
    return new Condition(left.trim(), operator, right);
  }
}

export class ConditionSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConditionSyntaxError";
  }
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
