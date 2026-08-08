import { Entity } from "./Entity";

/**
 * DetClassification — DET classification entity extracted from
 * cdd.iec.ch search-export .xls files.
 *
 * Mirrors Opencdd::DetClassification (lib/opencdd/det_classification.rb).
 * Registered under meta-class IRDI MDC_C0101. Carries the common
 * identifying fields (irdi, code, preferred_name, definition, version,
 * revision) — no type-specific accessors are needed.
 *
 * Note: the Ruby class overrides Entity.from_row to synthesize full
 * IRDIs from short codes (e.g. "A11" → "0112/2///IECCDD_001#A11") at
 * Parcel-ingestion time. That synthesis is a Parcel-reader concern and
 * is not needed in TS — by the time data reaches this layer, IRDIs are
 * already canonical.
 */
export class DetClassification extends Entity {
  static readonly PARENT_PROPERTY_IDS: readonly string[] = [];
}
