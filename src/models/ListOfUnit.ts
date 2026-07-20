import { Entity } from "./Entity";

/**
 * ListOfUnit — IEC 62720 entity for a named system of units.
 *
 * Examples: "Metre-kilogram-second-ampere system of units", "Imperial
 * units", "SI units". Carries only the common identifying fields in the
 * wild (irdi, code, preferred_name, definition). Provisional TS-only
 * extension pending Ruby gem registration of the meta-class — see
 * MetaClasses.generated.ts MDC_C013.
 */
export class ListOfUnit extends Entity {
  static readonly PARENT_PROPERTY_IDS: readonly string[] = [];
}
