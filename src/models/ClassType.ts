export type ClassTypeValue =
  "ITEM_CLASS" | "CATEGORICAL_CLASS" | "VALUE_CLASS" | "MESSAGE_CLASS";

const VALUES: ReadonlySet<ClassTypeValue> = new Set([
  "ITEM_CLASS",
  "CATEGORICAL_CLASS",
  "VALUE_CLASS",
  "MESSAGE_CLASS",
]);

export class ClassType {
  readonly value: ClassTypeValue;

  private constructor(value: ClassTypeValue) {
    this.value = value;
    Object.freeze(this);
  }

  get item(): boolean {
    return this.value === "ITEM_CLASS";
  }

  get categorical(): boolean {
    return this.value === "CATEGORICAL_CLASS";
  }

  get valueClass(): boolean {
    return this.value === "VALUE_CLASS";
  }

  get message(): boolean {
    return this.value === "MESSAGE_CLASS";
  }

  toString(): string {
    return this.value;
  }

  equals(other: ClassType): boolean {
    return other instanceof ClassType && other.value === this.value;
  }

  static parse(raw: unknown): ClassType | null {
    if (raw === null || raw === undefined) return null;
    const s = String(raw).trim().toUpperCase();
    if (s.length === 0) return null;
    return VALUES.has(s as ClassTypeValue)
      ? new ClassType(s as ClassTypeValue)
      : null;
  }
}
