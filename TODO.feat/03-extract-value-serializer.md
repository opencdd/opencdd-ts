# Plan 03 — Extract ValueSerializer from Builder

## Why

`Builder.ts` inlines value-node-to-string conversion (240+ lines for
the whole file). Ruby factors this into a stateless
`Opencdd::Cddal::ValueSerializer` module so the AST-level Serializer
and the Builder share the same logic.

DRY violation. When the AST-level Serializer needs to emit a Set, it
reimplements the same `{a,b,c}` formatting. Two code paths = drift
risk.

## Scope

- `src/cddal/ValueSerializer.ts` — pure functions
- `Builder.ts` consumes it
- `Serializer.ts` (AST-level) consumes it for value nodes
- Spec under `tests/cddal-value-serializer.test.ts`

## Approach

```ts
export function serializeValue(value: ValueNode): string {
  switch (value.node) {
    case "literal":
      return value.raw;
    case "identifier_ref":
      return serializeIdentifierRef(value);
    case "set":
      return `{${value.elements.map(serializeValue).join(",")}}`;
    case "tuple":
      return `(${value.elements.map(serializeValue).join(",")})`;
    case "class_reference":
      return `${value.typeName}(${serializeValue(value.argument)})`;
    case "condition":
      return `${value.left} ${value.operator} ${serializeValue(value.right)}`;
  }
}
```

Pure function — no state, no side effects. The Builder's
`serializeValue` (currently a private helper) becomes a one-liner
delegating to this module.

## Acceptance

- [x] ValueSerializer module shipped
- [x] Builder.serializeValue delegates to it
- [x] AST Serializer.emitValue delegates to it for value nodes
- [x] All existing tests still pass (no behavior change)
- [x] Spec covers each ValueNode kind + nested combinations

## Dependencies

None. Pure refactor.
