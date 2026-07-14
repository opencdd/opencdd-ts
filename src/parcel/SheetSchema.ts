import { canonicalParcelId } from "./canonicalParcelId";

export const SHEET_DIRECTIVE_ROWS = [
  "PROPERTY_ID",
  "ALTERNATE_ID",
  "SUPER_ALTERNATE_ID",
  "SUB_ALTERNATE_ID",
  "EQUIVALENT_ID",
  "SUPER_PROPERTY",
  "PROPERTY_NAME",
  "DEFINITION",
  "NOTE",
  "DATATYPE",
  "UNIT",
  "VARIABLE_PREFIX_UNIT",
  "UNIT_ID",
  "ALTERNATIVE_UNITS",
  "VALUE_FORMAT",
  "PATTERN",
  "RELATION",
  "DEFAULT_VALUE",
  "DEFAULT_DATA_SUPPLIER",
  "DEFAULT_DATA_VERSION",
  "REQUIREMENT",
] as const;

export type SheetDirectiveRow = (typeof SHEET_DIRECTIVE_ROWS)[number];

export type Requirement = "MAND" | "OPT" | "KEY" | "OBS" | string;

export interface SheetColumn {
  readonly index: number;
  readonly propertyId: string;
  readonly rawPropertyId: string;
  readonly alternateId?: string;
  readonly superAlternateId?: string;
  readonly subAlternateId?: string;
  readonly equivalentId?: string;
  readonly superProperty?: string;
  readonly nameByLang: Readonly<Record<string, string>>;
  readonly definitionByLang: Readonly<Record<string, string>>;
  readonly noteByLang: Readonly<Record<string, string>>;
  readonly datatype?: string;
  readonly unit?: string;
  readonly variablePrefixUnit?: string;
  readonly unitId?: string;
  readonly alternativeUnits?: string;
  readonly valueFormat?: string;
  readonly pattern?: string;
  readonly relation?: string;
  readonly defaultValue?: string;
  readonly defaultDataSupplier?: string;
  readonly defaultDataVersion?: string;
  readonly requirement?: Requirement;
}

function columnName(col: SheetColumn, lang = "en"): string | undefined {
  return col.nameByLang[lang];
}

export function columnRequired(col: SheetColumn): boolean {
  return col.requirement === "MAND";
}

export function columnKey(col: SheetColumn): boolean {
  return col.requirement === "KEY";
}

export function columnObsolete(col: SheetColumn): boolean {
  return col.requirement === "OBS";
}

export type DirectiveCell = string | number | boolean | null | undefined;

export class SheetSchema {
  private readonly columns: SheetColumn[] = [];
  private readonly columnsById = new Map<string, SheetColumn>();
  private readonly columnDirectives = new Map<
    string,
    (DirectiveCell | undefined)[]
  >();
  private finalized = false;

  static fromHeaderRows(
    rows: readonly (readonly DirectiveCell[])[],
  ): SheetSchema {
    const schema = new SheetSchema();
    for (const row of rows) schema.addDirectiveRow(row);
    schema.finalize();
    return schema;
  }

  addDirectiveRow(row: readonly DirectiveCell[]): this {
    if (row.length === 0) return this;
    const labelCell = String(row[0] ?? "");
    const directive = parseDirective(labelCell);
    if (directive === null) return this;
    const values = row.slice(1);
    const existing = this.columnDirectives.get(directive) ?? [];
    values.forEach((val, idx) => {
      existing[idx] = val;
    });
    this.columnDirectives.set(directive, existing);
    return this;
  }

  addColumn(column: SheetColumn): this {
    this.columns.push(column);
    this.columnsById.set(column.propertyId, column);
    return this;
  }

  finalize(): this {
    if (this.finalized) return this;
    const ids = this.columnDirectives.get("PROPERTY_ID") ?? [];
    ids.forEach((rawId, idx) => {
      if (rawId === null || rawId === undefined) return;
      const trimmed = String(rawId).trim();
      if (trimmed.length === 0) return;
      const propertyId = canonicalParcelId(trimmed) ?? trimmed;
      const column: SheetColumn = {
        index: idx + 1,
        propertyId,
        rawPropertyId: trimmed,
        alternateId: this.lookup("ALTERNATE_ID", idx),
        superAlternateId: this.lookup("SUPER_ALTERNATE_ID", idx),
        subAlternateId: this.lookup("SUB_ALTERNATE_ID", idx),
        equivalentId: this.lookup("EQUIVALENT_ID", idx),
        superProperty: this.lookup("SUPER_PROPERTY", idx),
        nameByLang: this.langHashFor("PROPERTY_NAME", idx),
        definitionByLang: this.langHashFor("DEFINITION", idx),
        noteByLang: this.langHashFor("NOTE", idx),
        datatype: this.lookup("DATATYPE", idx),
        unit: this.lookup("UNIT", idx),
        variablePrefixUnit: this.lookup("VARIABLE_PREFIX_UNIT", idx),
        unitId: this.lookup("UNIT_ID", idx),
        alternativeUnits: this.lookup("ALTERNATIVE_UNITS", idx),
        valueFormat: this.lookup("VALUE_FORMAT", idx),
        pattern: this.lookup("PATTERN", idx),
        relation: this.lookup("RELATION", idx),
        defaultValue: this.lookup("DEFAULT_VALUE", idx),
        defaultDataSupplier: this.lookup("DEFAULT_DATA_SUPPLIER", idx),
        defaultDataVersion: this.lookup("DEFAULT_DATA_VERSION", idx),
        requirement: this.lookup("REQUIREMENT", idx) as Requirement | undefined,
      };
      this.columns.push(column);
      this.columnsById.set(column.propertyId, column);
    });
    this.finalized = true;
    return this;
  }

  get size(): number {
    return this.columns.length;
  }

  column(propertyIdOrName: string, lang = "en"): SheetColumn | undefined {
    return (
      this.findByPropertyId(propertyIdOrName) ??
      this.findByName(propertyIdOrName, lang)
    );
  }

  findByPropertyId(id: string): SheetColumn | undefined {
    return this.columnsById.get(id);
  }

  findByName(name: string, lang = "en"): SheetColumn | undefined {
    const needle = name.toLowerCase();
    return this.columns.find(
      (c) => (columnName(c, lang) ?? "").toLowerCase() === needle,
    );
  }

  each(callback: (col: SheetColumn) => void): void {
    this.columns.forEach(callback);
  }

  [Symbol.iterator](): Iterator<SheetColumn> {
    return this.columns[Symbol.iterator]();
  }

  private lookup(directive: string, colIdx: number): string | undefined {
    const vals = this.columnDirectives.get(directive);
    if (!vals) return undefined;
    const v = vals[colIdx];
    if (v === null || v === undefined) return undefined;
    const s = String(v).trim();
    return s.length === 0 ? undefined : s;
  }

  private langHashFor(
    directive: string,
    colIdx: number,
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, vals] of this.columnDirectives) {
      const dot = key.indexOf(".");
      const base = dot === -1 ? key : key.slice(0, dot);
      const lang = dot === -1 ? "" : key.slice(dot + 1);
      if (base !== directive) continue;
      const v = vals[colIdx];
      if (v === null || v === undefined) continue;
      const s = String(v).trim();
      if (s.length === 0) continue;
      const langKey = lang.length === 0 ? "en" : lang;
      out[langKey] = s;
    }
    return out;
  }
}

function parseDirective(cell: string): string | null {
  const s = cell.trim();
  if (!s.startsWith("#")) return null;
  return s.slice(1);
}
