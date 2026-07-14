/**
 * PropertyDataTypeElement — IEC 61360 P_DET classification.
 *
 * Ported from Cdd::PropertyDataTypeElement (lib/cdd/property_data_element_type.rb).
 * Reads the `property_data_element_type` property (MDC_P020) on Property entities.
 *
 * Three valid values control conditional behaviour:
 *   NON_DEPENDENT_P_DET — unconditional
 *   CONDITION_DET       — applies under a predicate (see Property#condition)
 *   DEPENDENT_P_DET     — depends on another property's value
 */

export type PropertyDataElementTypeValue =
  "NON_DEPENDENT_P_DET" | "CONDITION_DET" | "DEPENDENT_P_DET";

const VALUES: ReadonlySet<PropertyDataElementTypeValue> = new Set([
  "NON_DEPENDENT_P_DET",
  "CONDITION_DET",
  "DEPENDENT_P_DET",
]);

export class PropertyDataTypeElement {
  private constructor(readonly value: PropertyDataElementTypeValue) {
    Object.freeze(this);
  }

  get nonDependent(): boolean {
    return this.value === "NON_DEPENDENT_P_DET";
  }

  get condition(): boolean {
    return this.value === "CONDITION_DET";
  }

  get dependent(): boolean {
    return this.value === "DEPENDENT_P_DET";
  }

  get conditional(): boolean {
    return this.condition || this.dependent;
  }

  toString(): string {
    return this.value;
  }

  equals(other: PropertyDataTypeElement): boolean {
    return (
      other instanceof PropertyDataTypeElement && this.value === other.value
    );
  }

  static parse(raw: string | null | undefined): PropertyDataTypeElement | null {
    if (raw === null || raw === undefined) return null;
    const s = raw.trim().toUpperCase();
    if (s.length === 0) return null;
    if (!VALUES.has(s as PropertyDataElementTypeValue)) return null;
    return new PropertyDataTypeElement(s as PropertyDataElementTypeValue);
  }

  static of(value: PropertyDataElementTypeValue): PropertyDataTypeElement {
    return new PropertyDataTypeElement(value);
  }
}
