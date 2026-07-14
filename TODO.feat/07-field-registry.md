# Plan 07 — Field registry + typed reader

## Why

Every entity subclass hardcodes property ID accessors:

```ts
get classType() { return ClassType.parse(this.get(Pids.MDC_P011)); }
get superclassIrdi() { ... this.get(Pids.MDC_P010) ... }
```

The mapping (semantic name → wire ID) is scattered across Klass,
Property, Unit, ValueList, ValueTerm, Relation, ViewControl. Adding a
new field means finding every place that references the wire ID.

The YamlEntity converter has its own copy of the same mapping — same
IDs, same multilingual handling. Two copies = drift risk.

The Ruby gem has `Entity::FieldRegistry`: one place per entity type
that declares every field's semantic name, wire ID, value kind,
multilingual flag, and reader. FieldReader.extract looks up the field
and coerces the raw value to the typed Ruby object.

## Scope

- `src/models/FieldRegistry.ts` — declarative field metadata per entity type
- `Entity.field(name, lang?)` — typed reader via the registry
- Refactor YamlEntity to use the registry (no more hardcoded MDC_P### list)
- Spec under `tests/field-registry.test.ts`

## Approach

```ts
export interface FieldSpec {
  readonly name: string;
  readonly propertyId: string;
  readonly valueKind: ValueKind;
  readonly multilingual?: boolean;
}

export const FIELDS: Readonly<Record<EntityType, readonly FieldSpec[]>> = {
  class: [
    { name: "class_type", propertyId: "MDC_P011", valueKind: "class_type" },
    { name: "superclass", propertyId: "MDC_P010", valueKind: "irdi" },
    { name: "is_case_of", propertyId: "MDC_P013", valueKind: "set_of_refs" },
    ...
  ],
  property: [...],
  ...
};

export function fieldFor(type: EntityType, name: string): FieldSpec | undefined { ... }
```

Entity gets a generic reader:

```ts
field<T = unknown>(name: string, lang?: string): T | undefined {
  const spec = fieldFor(this.type!, name);
  if (!spec) return undefined;
  return FieldReader.read(this, spec, lang) as T;
}
```

YamlEntity looks up fields via the registry instead of hardcoding
MDC_P### strings — one source of truth.

## Acceptance

- [x] FieldRegistry with FieldSpec per entity type
- [x] Entity.field(name, lang) generic reader
- [x] YamlEntity uses the registry for both directions
- [x] Existing typed accessors (Klass.classType etc.) remain — they delegate to the registry
- [x] Spec covers registry lookup + Entity.field + YamlEntity parity

## Future work (not in scope)

- Branded property-id types (`type PropertyId = string & { __brand: "PropertyId" }`)
  to prevent typos at compile time. The registry becomes the only way
  to construct a `PropertyId`. Captured for a future PR.
