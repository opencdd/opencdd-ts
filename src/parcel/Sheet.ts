import { ParcelMetadata } from "./Metadata";
import { SheetSchema, type SheetColumn } from "./SheetSchema";
import { canonicalParcelId } from "./canonicalParcelId";
import { REGISTRY as PID_REGISTRY } from "../models/PropertyIds.generated";
import {
  REGISTRY as META_REGISTRY,
  codePropertyIdFor as metaCodePropertyIdFor,
} from "../models/MetaClasses.generated";

const DEFAULT_REQUIREMENT_FOR_CODE = "KEY";
const DEFAULT_REQUIREMENT_OTHER = "OPT";
const DEFAULT_SOURCE_LANGUAGE = "en";

export type RowCell = string | number | boolean | null | undefined;
export type RawRow = readonly RowCell[];
export type InstanceRow = Record<string, string | number | null>;

export interface SheetOptions {
  readonly name: string;
  readonly metadata: ParcelMetadata;
  readonly schema: SheetSchema;
  readonly rawRows: readonly RawRow[];
}

export class Sheet {
  readonly name: string;
  readonly metadata: ParcelMetadata;
  readonly schema: SheetSchema;
  readonly rawRowCount: number;
  readonly rows: readonly InstanceRow[];

  constructor(opts: SheetOptions) {
    this.name = opts.name;
    this.metadata = opts.metadata;
    this.schema = opts.schema;
    this.rawRowCount = opts.rawRows.length;
    this.rows = Sheet.buildRows(opts.rawRows, opts.schema);
    Object.freeze(this);
  }

  static scaffold(params: {
    metaClassIrdi: string;
    parcelId: string;
    sourceLanguage?: string;
    translationLanguages?: readonly string[];
    sheetName?: string;
  }): Sheet {
    const sourceLanguage = params.sourceLanguage ?? DEFAULT_SOURCE_LANGUAGE;
    const translationLanguages = params.translationLanguages ?? [];
    const meta = META_REGISTRY[params.metaClassIrdi];
    if (!meta) throw new Error(`unknown meta-class ${params.metaClassIrdi}`);

    const codePropertyId = metaCodePropertyIdFor(meta.irdi);
    const languages = Array.from(
      new Set([sourceLanguage, ...translationLanguages]),
    );

    const schema = new SheetSchema();
    meta.allowedPropertyIds.forEach((propertyId, idx) => {
      const nameByLang: Record<string, string> = {};
      for (const lang of languages)
        nameByLang[lang] = Sheet.displayNameFor(propertyId, lang);
      schema.addColumn({
        index: idx + 1,
        propertyId,
        rawPropertyId: propertyId,
        nameByLang,
        definitionByLang: {},
        noteByLang: {},
        datatype: Sheet.defaultDatatypeFor(propertyId),
        valueFormat: undefined,
        pattern: undefined,
        requirement:
          propertyId === codePropertyId
            ? DEFAULT_REQUIREMENT_FOR_CODE
            : DEFAULT_REQUIREMENT_OTHER,
      });
    });

    const metadata = new ParcelMetadata();
    metadata.add(`#CLASS_ID := ${meta.irdi}`);
    metadata.add(`#CLASS_NAME.${sourceLanguage} := ${meta.name}`);
    metadata.add(`#SOURCE_LANGUAGE := ${sourceLanguage}`);
    if (translationLanguages.length > 0) {
      metadata.add(
        `#TRANSLATION_LANGUAGE := ${translationLanguages.join(",")}`,
      );
    }

    const name =
      params.sheetName ?? `${params.parcelId}_${meta.name.toUpperCase()}`;
    return new Sheet({ name, metadata, schema, rawRows: [] });
  }

  static fromRows(rows: readonly RawRow[], name?: string): Sheet {
    const metadata = new ParcelMetadata();
    const headerRows: RawRow[] = [];
    const dataRows: RawRow[] = [];

    for (const rawRow of rows) {
      const firstCell = String(rawRow[0] ?? "").trim();
      if (firstCell.startsWith("#") && firstCell.includes(":=")) {
        metadata.add(firstCell);
        continue;
      }
      if (firstCell.startsWith("#")) {
        headerRows.push(rawRow);
        continue;
      }
      if (Sheet.rowHasData(rawRow)) dataRows.push(rawRow);
    }

    const schema = SheetSchema.fromHeaderRows(headerRows);
    return new Sheet({ name: name ?? "", metadata, schema, rawRows: dataRows });
  }

  static displayNameFor(propertyId: string, _lang: string): string {
    const entry = PID_REGISTRY[propertyId];
    if (!entry) return propertyId;
    return entry.aliases[0] ?? propertyId;
  }

  static defaultDatatypeFor(propertyId: string): string | undefined {
    const entry = PID_REGISTRY[propertyId];
    if (!entry) return undefined;
    switch (entry.valueKind) {
      case "identifier_ref":
      case "class_ref":
      case "set_of_refs":
        return "ICID_STRING";
      case "date":
        return "DATE_TYPE";
      case "date_time":
        return "DATE_TIME_TYPE";
      case "condition":
        return "STRING_TYPE";
      default:
        return "STRING_TYPE";
    }
  }

  private static rowHasData(row: RawRow): boolean {
    for (let i = 1; i < row.length; i++) {
      const v = row[i];
      if (v === null || v === undefined) continue;
      const s = String(v).trim();
      if (s.length > 0) return true;
    }
    return false;
  }

  private static buildRows(
    rawRows: readonly RawRow[],
    schema: SheetSchema,
  ): InstanceRow[] {
    const out: InstanceRow[] = [];
    rawRows.forEach((raw, resultIdx) => {
      const instance = Sheet.buildInstance(raw, schema);
      if (!instance) return;
      instance["__row_index__"] = resultIdx;
      out.push(instance);
    });
    return out;
  }

  private static buildInstance(
    row: RawRow,
    schema: SheetSchema,
  ): InstanceRow | null {
    const h: InstanceRow = {};
    let anyValue = false;
    schema.each((col) => {
      const v = row[col.index];
      if (v === null || v === undefined) return;
      const s = Sheet.valueToString(v);
      if (s.length === 0) return;
      const key = Sheet.storageKeyFor(col);
      h[key] = s;
      anyValue = true;
    });
    if (!anyValue) return null;
    return h;
  }

  private static storageKeyFor(col: SheetColumn): string {
    const pid = col.propertyId;
    if (pid.includes(".")) return pid;
    const entry = PID_REGISTRY[pid];
    if (!entry?.multilingual) return pid;
    const langs = Object.keys(col.nameByLang);
    if (langs.length !== 1) return pid;
    return `${pid}.${langs[0]}`;
  }

  private static valueToString(v: RowCell): string {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "number") {
      if (Number.isInteger(v)) return String(v);
      return String(v);
    }
    if (typeof v === "boolean") return v ? "true" : "false";
    return String(v).trim();
  }

  get size(): number {
    return this.rows.length;
  }

  each(callback: (row: InstanceRow) => void): void {
    this.rows.forEach(callback);
  }

  [Symbol.iterator](): Iterator<InstanceRow> {
    return this.rows[Symbol.iterator]();
  }
}

export { canonicalParcelId };
