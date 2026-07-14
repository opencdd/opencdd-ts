/**
 * DataType — IEC 61360 data type expression.
 *
 * Ported from Cdd::DataType (lib/cdd/data_type.rb). Represents the
 * `data_type` property (MDC_P022) on Property and ValueTerm entities.
 *
 * Three families:
 *   - Simple: STRING_TYPE, REAL_TYPE, INTEGER_TYPE, BOOLEAN_TYPE, etc.
 *   - Measure: REAL_MEASURE_TYPE, INTEGER_MEASURE_TYPE
 *   - Parameterized: CLASS_REFERENCE(id), ENUM_STRING_TYPE(id), ENUM_REFERENCE_TYPE(id)
 */
export type DataTypeKind =
  "simple" | "measure" | "class_reference" | "enum_string" | "enum_reference";

const SIMPLE_TYPES = new Set([
  "STRING_TYPE",
  "TRANSLATABLE_STRING_TYPE",
  "REAL_TYPE",
  "INTEGER_TYPE",
  "INT_TYPE",
  "BOOLEAN_TYPE",
  "DATE_TYPE",
  "DATE_TIME_TYPE",
  "DATETIME_TYPE",
  "TIME_TYPE",
  "IRDI_TYPE",
  "ICID_STRING",
  "ICID_STRING_TYPE",
  "URL_TYPE",
  "MIME_TYPE",
  "FILE_TYPE",
  "COMPLEX_TYPE",
]);

const MEASURE_TYPES = new Set([
  "REAL_MEASURE_TYPE",
  "INTEGER_MEASURE_TYPE",
  "INT_MEASURE_TYPE",
]);

const PARAMETERIZED_TYPES = new Set([
  "CLASS_REFERENCE",
  "ENUM_STRING_TYPE",
  "ENUM_REFERENCE_TYPE",
]);

export abstract class DataType {
  abstract readonly kind: DataTypeKind;
  abstract toString(): string;

  get simple(): boolean {
    return SIMPLE_TYPES.has(this.toString());
  }

  get measure(): boolean {
    return MEASURE_TYPES.has(this.toString());
  }

  get parameterized(): boolean {
    return PARAMETERIZED_TYPES.has(this.baseKind);
  }

  get reference(): boolean {
    return (
      this.kind === "class_reference" ||
      this.kind === "enum_string" ||
      this.kind === "enum_reference"
    );
  }

  get classReference(): boolean {
    return this.kind === "class_reference";
  }

  get enum(): boolean {
    return this.kind === "enum_string" || this.kind === "enum_reference";
  }

  protected abstract get baseKind(): string;

  equals(other: DataType): boolean {
    return other instanceof DataType && this.toString() === other.toString();
  }

  static parse(raw: string | null | undefined): DataType | null {
    if (!raw) return null;
    const s = raw.trim();
    if (!s) return null;

    let m = s.match(/^CLASS_REFERENCE\s*\(\s*(.+?)\s*\)$/);
    if (m) return new ClassReference(m[1]);

    m = s.match(/^ENUM_STRING_TYPE\s*\(\s*(.+?)\s*\)$/);
    if (m) return new EnumStringType(m[1]);

    m = s.match(/^ENUM_REFERENCE_TYPE\s*\(\s*(.+?)\s*\)$/);
    if (m) return new EnumReferenceType(m[1]);

    switch (s) {
      case "REAL_MEASURE_TYPE":
      case "REAL_MEASURE":
        return new RealMeasureType();
      case "INTEGER_MEASURE_TYPE":
      case "INT_MEASURE_TYPE":
      case "INTEGER_MEASURE":
      case "INT_MEASURE":
        return new IntegerMeasureType();
      default:
        if (SIMPLE_TYPES.has(s)) return new SimpleDataType(s);
        throw new ArgumentError(`unknown data_type: ${JSON.stringify(s)}`);
    }
  }

  static parseOrString(raw: string | null | undefined): DataType | string {
    try {
      return DataType.parse(raw) ?? "";
    } catch {
      return String(raw ?? "");
    }
  }
}

class ArgumentError extends Error {}

export class SimpleDataType extends DataType {
  readonly kind = "simple" as const;

  constructor(private readonly name: string) {
    super();
    Object.freeze(this);
  }

  protected get baseKind(): string {
    return this.name;
  }

  toString(): string {
    return this.name;
  }
}

export class RealMeasureType extends DataType {
  readonly kind = "measure" as const;

  protected get baseKind(): string {
    return "REAL_MEASURE_TYPE";
  }

  toString(): string {
    return "REAL_MEASURE_TYPE";
  }
}

export class IntegerMeasureType extends DataType {
  readonly kind = "measure" as const;

  protected get baseKind(): string {
    return "INTEGER_MEASURE_TYPE";
  }

  toString(): string {
    return "INTEGER_MEASURE_TYPE";
  }
}

export class ClassReference extends DataType {
  readonly kind = "class_reference" as const;

  constructor(readonly classIdentifier: string) {
    super();
    Object.freeze(this);
  }

  protected get baseKind(): string {
    return "CLASS_REFERENCE";
  }

  toString(): string {
    return `CLASS_REFERENCE(${this.classIdentifier})`;
  }
}

export class EnumStringType extends DataType {
  readonly kind = "enum_string" as const;

  constructor(readonly valueListIdentifier: string) {
    super();
    Object.freeze(this);
  }

  protected get baseKind(): string {
    return "ENUM_STRING_TYPE";
  }

  toString(): string {
    return `ENUM_STRING_TYPE(${this.valueListIdentifier})`;
  }
}

export class EnumReferenceType extends DataType {
  readonly kind = "enum_reference" as const;

  constructor(readonly valueListIdentifier: string) {
    super();
    Object.freeze(this);
  }

  protected get baseKind(): string {
    return "ENUM_REFERENCE_TYPE";
  }

  toString(): string {
    return `ENUM_REFERENCE_TYPE(${this.valueListIdentifier})`;
  }
}
