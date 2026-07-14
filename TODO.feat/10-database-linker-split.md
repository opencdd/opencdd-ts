# Plan 10 — Database linker/storage split (DEFERRED)

## Why

`Database.ts` is 489 lines doing four jobs:

1. **Storage** — `entitiesByIrdi`, `entitiesByCode`, `entitiesByType` maps
2. **Graph invariants** — `linkClassHierarchy`, `linkPropertyClasses`, `linkValueLists`
3. **Symbol table** — `registerSymbol`, `resolveReference`
4. **Traversal + persistence** — `classes()`, `properties()`, `toYaml()`, etc.

MECE violation. The linking passes are conceptually separate from
storage. They could live in a `DatabaseLinker` class that runs after
mutations batch.

This would also let us batch link passes (currently `finalized` flag
re-runs all four passes on the next access after any mutation).

## Scope

- `src/models/DatabaseLinker.ts` — owns the four link passes
- `Database.finalize()` delegates to DatabaseLinker
- Possibly: `Database.mutate(batch => { ... })` for atomic batches

## Approach

```ts
export class DatabaseLinker {
  constructor(private readonly db: Database) {}

  linkAll(): void {
    this.normalizeReferenceCollections();
    this.linkClassHierarchy();
    this.linkPropertyClasses();
    this.linkValueLists();
    this.rebuildSymbolTable();
  }
}
```

Each pass becomes a method on DatabaseLinker rather than a private
method on Database. Database becomes storage + lookup; linking is a
separate concern.

## Acceptance

- [ ] DatabaseLinker class shipped
- [ ] Database.finalize() delegates
- [ ] All tests still pass
- [ ] Database.ts shrinks by ~150 lines

## Status

DEFERRED. Large refactor; benefits are real but the cost is high.
Revisit after TODO.feat/07 (field registry) lands, since the linker
will use the registry for typed property access.
