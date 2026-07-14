# Plan 11 — Database iterator API (DEFERRED)

## Why

`Database.entities()`, `classes()`, `properties()`, etc. all return
arrays:

```ts
entities(): Entity[] { return [...this.entitiesByIrdi.values()]; }
```

Every call allocates a new array. For large dictionaries (IEC 61987
has 11K+ entities), this is measurable: iteration over `entities()`
inside another loop is O(n²) on allocations.

## Scope

- Add `eachEntity(): Iterable<Entity>` returning the map's iterator directly
- Keep `entities(): Entity[]` for back-compat
- Audit hot paths (Database.finalize, DatabaseSerializer.toCddal, Builder.resolvePropertyReferences) to use the iterator

## Approach

```ts
eachEntity(): IterableIterator<Entity> {
  return this.entitiesByIrdi.values();
}

// Back-compat
entities(): Entity[] {
  return [...this.eachEntity()];
}
```

Hot paths switch to `for (const e of db.eachEntity())` to avoid the
array allocation. Callers that need a stable snapshot still use
`entities()`.

## Acceptance

- [ ] `eachEntity` and friends shipped
- [ ] Hot paths use iterators
- [ ] Benchmark on IEC 61987 (11K entities) shows improvement
- [ ] All tests still pass

## Status

DEFERRED. Performance optimization; current code is correct, just
allocation-heavy on large dictionaries. Revisit when the editor
starts loading 10K+ entity dictionaries in the browser.
