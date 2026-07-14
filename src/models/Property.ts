import { Entity } from "./Entity";
import { IRDI } from "./IRDI";
import * as Pids from "./PropertyIds.generated";
import { parseIrdiList } from "./helpers";
import { DataType } from "./DataType";
import { Condition } from "./Condition";
import { PropertyDataTypeElement } from "./PropertyDataTypeElement";

export const DATA_TYPE_ALIASES: Readonly<Record<string, string>> = {
  STRING_TYPE: "string",
  TRANSLATABLE_STRING_TYPE: "translatable_string",
  REAL_MEASURE_TYPE: "real_measure",
  INTEGER_MEASURE_TYPE: "integer_measure",
  INT_MEASURE_TYPE: "integer_measure",
  REAL_TYPE: "real",
  INTEGER_TYPE: "integer",
  INT_TYPE: "integer",
  BOOLEAN_TYPE: "boolean",
  DATE_TYPE: "date",
  DATETIME_TYPE: "date_time",
  DATE_TIME_TYPE: "date_time",
  TIME_TYPE: "time",
  IRDI_TYPE: "irdi",
  ICID_STRING: "irdi",
  ICID_STRING_TYPE: "irdi",
  URL_TYPE: "url",
  MIME_TYPE: "mime",
  FILE_TYPE: "file",
  COMPLEX_TYPE: "complex",
};

/**
 * A CDD Property entity (IEC 61360 meta-class MDC_C003).
 *
 * Ported from Cdd::Property (lib/cdd/property.rb).
 */
export class Property extends Entity {
  private cachedCondition: Condition | null | undefined;
  private cachedDataElementType: PropertyDataTypeElement | null | undefined;

  get dataType(): string | undefined {
    const raw = this.getString(Pids.MDC_P022);
    return raw ? (DATA_TYPE_ALIASES[raw] ?? raw) : undefined;
  }

  get dataTypeRaw(): string | undefined {
    return this.getString(Pids.MDC_P022);
  }

  get dataTypeParsed(): DataType | null {
    return DataType.parse(this.dataTypeRaw ?? null);
  }

  get parsedDataType(): DataType | string {
    return DataType.parseOrString(this.dataTypeRaw ?? null);
  }

  get isEnum(): boolean {
    const dt = this.dataTypeParsed;
    return (
      dt !== null && (dt.kind === "enum_string" || dt.kind === "enum_reference")
    );
  }

  get valueFormat(): string | undefined {
    return this.getString(Pids.MDC_P024);
  }

  get unitIrdi(): IRDI | null {
    const raw = this.getString(Pids.MDC_P041);
    return raw ? IRDI.parse(raw) : null;
  }

  get alternativeUnitIrdis(): IRDI[] {
    return parseIrdiList(this.get(Pids.MDC_P042));
  }

  get constraint(): string | undefined {
    return this.getString(Pids.MDC_P068);
  }

  get typeClassification(): string | undefined {
    return this.getString(Pids.MDC_P033);
  }

  get conditionRaw(): string | undefined {
    return this.getString(Pids.MDC_P028);
  }

  get condition(): Condition | null {
    if (this.cachedCondition === undefined) {
      this.cachedCondition = Condition.parse(this.conditionRaw ?? null);
    }
    return this.cachedCondition;
  }

  get dataElementType(): PropertyDataTypeElement | null {
    if (this.cachedDataElementType === undefined) {
      this.cachedDataElementType = PropertyDataTypeElement.parse(
        this.getString(Pids.MDC_P020),
      );
    }
    return this.cachedDataElementType;
  }

  get conditional(): boolean {
    return this.dataElementType?.conditional ?? false;
  }

  get definitionClassIrdi(): IRDI | null {
    const raw = this.getString(Pids.MDC_P021);
    return raw ? IRDI.parse(raw) : null;
  }

  get symbolInText(): string | undefined {
    return this.getString(Pids.MDC_P025_1);
  }

  get formula(): string | undefined {
    return this.getString(Pids.MDC_P027_1) ?? this.getString(Pids.MDC_P027_2);
  }
}
