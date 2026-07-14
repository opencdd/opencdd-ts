/**
 * RelationType — value object for the seven CDD relation types.
 *
 * Ported from Opencdd::RelationType (lib/opencdd/relation_type.rb).
 * Private constructor + static parse guarantees no invalid instances.
 *
 * The seven values:
 *   PREDICATION     — domain is_a codomain (e.g. Property is_a Property)
 *   FUNCTION        — codomain is computed from domain
 *   ASSOCIATION     — generic relation
 *   AGGREGATION     — domain is part_of codomain (hierarchical)
 *   COMPOSITION     — domain is exclusively part_of codomain
 *   GENERALIZATION  — domain is_a codomain (class hierarchy)
 *   SPECIALIZATION  — codomain is_a domain (inverse of GENERALIZATION)
 *
 * `hierarchical` predicate covers the four hierarchical kinds.
 */

export type RelationTypeValue =
  | "PREDICATION"
  | "FUNCTION"
  | "ASSOCIATION"
  | "AGGREGATION"
  | "COMPOSITION"
  | "GENERALIZATION"
  | "SPECIALIZATION";

const VALUES: ReadonlySet<RelationTypeValue> = new Set<RelationTypeValue>([
  "PREDICATION",
  "FUNCTION",
  "ASSOCIATION",
  "AGGREGATION",
  "COMPOSITION",
  "GENERALIZATION",
  "SPECIALIZATION",
]);

export class RelationType {
  readonly value: RelationTypeValue;

  private constructor(value: RelationTypeValue) {
    this.value = value;
    Object.freeze(this);
  }

  get predication(): boolean {
    return this.value === "PREDICATION";
  }
  get function(): boolean {
    return this.value === "FUNCTION";
  }
  get association(): boolean {
    return this.value === "ASSOCIATION";
  }
  get aggregation(): boolean {
    return this.value === "AGGREGATION";
  }
  get composition(): boolean {
    return this.value === "COMPOSITION";
  }
  get generalization(): boolean {
    return this.value === "GENERALIZATION";
  }
  get specialization(): boolean {
    return this.value === "SPECIALIZATION";
  }
  get hierarchical(): boolean {
    return (
      this.generalization ||
      this.specialization ||
      this.aggregation ||
      this.composition
    );
  }

  toString(): string {
    return this.value;
  }

  equals(other: RelationType): boolean {
    return other instanceof RelationType && other.value === this.value;
  }

  static parse(raw: unknown): RelationType | null {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim().toUpperCase();
    if (s.length === 0) return null;
    return VALUES.has(s as RelationTypeValue)
      ? new RelationType(s as RelationTypeValue)
      : null;
  }

  static readonly PREDICATION = RelationType.parse("PREDICATION")!;
  static readonly FUNCTION = RelationType.parse("FUNCTION")!;
  static readonly ASSOCIATION = RelationType.parse("ASSOCIATION")!;
  static readonly AGGREGATION = RelationType.parse("AGGREGATION")!;
  static readonly COMPOSITION = RelationType.parse("COMPOSITION")!;
  static readonly GENERALIZATION = RelationType.parse("GENERALIZATION")!;
  static readonly SPECIALIZATION = RelationType.parse("SPECIALIZATION")!;
}
