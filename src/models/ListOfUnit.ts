import { Entity } from "./Entity";

/**
 * ListOfUnit — IEC 62720 entity for a named system of units.
 *
 * Examples: "Metre-kilogram-second-ampere system of units", "Imperial
 * units", "SI units". Carries only the common identifying fields in the
 * wild (irdi, code, preferred_name, definition). Meta-class IRDI is
 * MDC_C0100 per the Ruby REGISTRY (lib/opencdd/meta_class.rb).
 */
export class ListOfUnit extends Entity {
  static readonly PARENT_PROPERTY_IDS: readonly string[] = [];
}
