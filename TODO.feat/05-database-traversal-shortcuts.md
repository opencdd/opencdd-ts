# Plan 05 — Database traversal shortcuts

## Why

The TS port ships `ClassTree`, `RelationTree`, `CompositionTree`, and
`EffectiveProperties` as standalone walker classes. To use them, the
caller has to construct them:

```ts
const tree = new ClassTree(db, { fields: ClassTree.CLASS_TREE_DEFAULT_FIELDS });
const ep = new EffectiveProperties(db);
const cp = new CompositionTree(db).for(klass, { maxDepth: 10 });
```

The Ruby Database provides one-liner shortcuts:

```ruby
db.class_tree
db.effective_properties
db.composition_tree(klass)
db.relation_tree(root)
```

For ergonomic API parity, the TS Database should expose the same
shortcuts. They're zero-cost (lazy or trivial delegation).

## Scope

- Add `classTree()`, `effectiveProperties()`, `compositionTree(klass)`, `relationTree(root?)` to Database
- ApplyViewControl helper for property filtering

## Approach

```ts
classTree(): ClassTree {
  return new ClassTree(this);
}

effectiveProperties(): EffectiveProperties {
  return new EffectiveProperties(this);
}

compositionTree(klass: Klass | IRDI | string, maxDepth = 10) {
  return new CompositionTree(this).for(this.coerceToKlass(klass)!, { maxDepth });
}

relationTree(root?: Klass | IRDI | string | null, maxDepth = 10) {
  return new RelationTree(this).for(root ?? null, { maxDepth });
}
```

## Acceptance

- [x] All four shortcuts shipped
- [x] Spec covers each shortcut
- [x] All existing tests still pass

## Dependencies

None.

Required by: nothing, but pairing with TODO.feat/04 gives the full
"Database as traversal entry point" API surface that the Ruby gem has.
