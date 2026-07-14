import { Sheet } from "./Sheet";
import { type EntityType } from "../models/MetaClasses.generated";

export interface SheetMapEntry {
  readonly projectId: string;
  readonly parcelId?: string;
  readonly classIrdi?: string;
  readonly contentNo: number;
  readonly sheetNo: number;
  readonly sheetName: string;
  readonly type: EntityType | string;
  readonly target: string;
}

export interface ProjectInfo {
  readonly projectId: string;
  readonly parcelId?: string;
  readonly multiLanguage: boolean;
  readonly baseLanguage: string;
}

export type HeaderRowName =
  | "class_id"
  | "class_name"
  | "source_language"
  | "translation_language"
  | "property_id"
  | "property_name"
  | "datatype"
  | "value_format"
  | "pattern"
  | "default_value"
  | "requirement"
  | "unit";

export const HEADER_ROW_NAMES: readonly HeaderRowName[] = [
  "class_id",
  "class_name",
  "source_language",
  "translation_language",
  "property_id",
  "property_name",
  "datatype",
  "value_format",
  "pattern",
  "default_value",
  "requirement",
  "unit",
];

export const MANDATORY_HEADER_ROWS: readonly HeaderRowName[] = [
  "class_id",
  "property_id",
];

const PARCEL_TYPE_LABELS: Readonly<Record<string, string>> = {
  class: "CLASS",
  property: "PROPERTY",
  value_list: "ENUM",
  value_term: "TERMINOLOGY",
  unit: "UoM",
  relation: "RELATION",
  view_control: "VIEWCONTROL",
};

export function parcelTypeLabelFor(type: EntityType | string): string {
  return PARCEL_TYPE_LABELS[type] ?? String(type).toUpperCase();
}

export interface WorkbookOptions {
  readonly sheets: readonly Sheet[];
  readonly sheetmap?: readonly SheetMapEntry[];
  readonly project?: ProjectInfo;
  readonly sourcePath?: string;
  readonly hiddenHeaderRows?: readonly HeaderRowName[];
}

export class Workbook {
  readonly sheets: readonly Sheet[];
  readonly sheetmap: readonly SheetMapEntry[];
  readonly project: ProjectInfo | undefined;
  readonly sourcePath: string | undefined;
  private readonly sheetsByName: Map<string, Sheet>;
  private readonly hiddenHeaderRowsInternal: Set<HeaderRowName>;

  constructor(opts: WorkbookOptions) {
    this.sheets = opts.sheets;
    this.sheetmap = opts.sheetmap ?? [];
    this.project = opts.project;
    this.sourcePath = opts.sourcePath;
    this.hiddenHeaderRowsInternal = Workbook.validateHidden(
      opts.hiddenHeaderRows,
    );
    this.sheetsByName = new Map(this.sheets.map((s) => [s.name, s]));
    Object.freeze(this);
  }

  get hiddenHeaderRows(): HeaderRowName[] {
    return [...this.hiddenHeaderRowsInternal];
  }

  sheet(name: string): Sheet | undefined {
    return this.sheetsByName.get(name);
  }

  sheetsOfType(type: EntityType | string): Sheet[] {
    return this.sheets.filter((s) => s.metadata.type === type);
  }

  get classSheet(): Sheet | undefined {
    return this.sheetsOfType("class")[0];
  }

  get propertySheet(): Sheet | undefined {
    return this.sheetsOfType("property")[0];
  }

  get unitSheet(): Sheet | undefined {
    return this.sheetsOfType("unit")[0];
  }

  get valueListSheet(): Sheet | undefined {
    return this.sheetsOfType("value_list")[0];
  }

  get valueTermSheet(): Sheet | undefined {
    return this.sheetsOfType("value_term")[0];
  }

  get relationSheet(): Sheet | undefined {
    return this.sheetsOfType("relation")[0];
  }

  get viewControlSheet(): Sheet | undefined {
    return this.sheetsOfType("view_control")[0];
  }

  eachSheet(callback: (sheet: Sheet) => void): void {
    this.sheets.forEach(callback);
  }

  get parcelId(): string | undefined {
    return this.project?.parcelId;
  }

  get projectId(): string | undefined {
    return this.project?.projectId;
  }

  get baseLanguage(): string {
    return this.project?.baseLanguage ?? "en";
  }

  merge(other: Workbook): Workbook {
    return new Workbook({
      sheets: [...this.sheets, ...other.sheets],
      sheetmap: [...this.sheetmap, ...other.sheetmap],
      project: this.project ?? other.project,
      sourcePath: this.sourcePath,
    });
  }

  private static validateHidden(
    rows: readonly HeaderRowName[] | undefined,
  ): Set<HeaderRowName> {
    if (!rows) return new Set();
    const set = new Set(rows);
    for (const r of set) {
      if (!HEADER_ROW_NAMES.includes(r)) {
        throw new Error(`unknown header row: ${r}`);
      }
    }
    for (const m of MANDATORY_HEADER_ROWS) {
      if (set.has(m)) {
        throw new Error(`cannot hide mandatory header row: ${m}`);
      }
    }
    return set;
  }
}
