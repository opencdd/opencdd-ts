export type ValueFormatCode = "NR1" | "NR2" | "NR3" | "M";

const CODES: ReadonlySet<ValueFormatCode> = new Set(["NR1", "NR2", "NR3", "M"]);

const PATTERN = /^\s*(NR1|NR2|NR3|M)(?:\s*(S)??\.\.(\d+))?(?:\.(\d+))?\s*$/;

export interface ValueFormatOptions {
  readonly code: ValueFormatCode;
  readonly signed?: boolean;
  readonly total?: number | null;
  readonly fractional?: number | null;
}

export class ValueFormat {
  readonly code: ValueFormatCode;
  readonly signed: boolean;
  readonly total: number | null;
  readonly fractional: number | null;

  constructor(opts: ValueFormatOptions) {
    if (!CODES.has(opts.code)) {
      throw new TypeError(
        `unknown value_format code: ${JSON.stringify(opts.code)}`,
      );
    }
    this.code = opts.code;
    this.signed = opts.signed ?? false;
    this.total = opts.total ?? null;
    this.fractional = opts.fractional ?? null;
    Object.freeze(this);
  }

  get numeric(): boolean {
    return this.code !== "M";
  }
  get string(): boolean {
    return this.code === "M";
  }

  toString(): string {
    if (this.code === "M") {
      return this.total !== null ? `M..${this.total}` : "M";
    }
    const sign = this.signed ? "S" : "";
    const frac = this.fractional !== null ? `.${this.fractional}` : "";
    const totalPart = this.total !== null ? `..${this.total}` : "";
    return `${this.code} ${sign}${totalPart}${frac}`.trim();
  }

  equals(other: unknown): boolean {
    return (
      other instanceof ValueFormat &&
      this.code === other.code &&
      this.signed === other.signed &&
      this.total === other.total &&
      this.fractional === other.fractional
    );
  }

  static parse(raw: unknown): ValueFormat | null {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim();
    if (s.length === 0) return null;
    const m = s.match(PATTERN);
    if (m === null) return null;
    return new ValueFormat({
      code: m[1] as ValueFormatCode,
      signed: m[2] === "S",
      total: m[3] !== undefined ? parseInt(m[3], 10) : null,
      fractional: m[4] !== undefined ? parseInt(m[4], 10) : null,
    });
  }
}
