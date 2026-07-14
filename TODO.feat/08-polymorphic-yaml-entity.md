# Plan 08 — Polymorphic YamlEntity

## Why

`src/persistence/YamlEntity.ts` is a 300-line switch statement on
`entity.type`. Adding a new entity type means editing the switch in
both `yamlEntityFromEntity` and `entityFromYamlEntity`. OCP violation.

The Ruby port has the same shape (it's a case statement in
`Entity::Yaml.from_entity`). The TS port can do better by making each
Entity subclass own its YAML shape.

## Scope

- Per-subclass `toYamlData()` and `fromYamlData()` methods
- YamlEntity becomes a thin dispatcher
- Spec under `tests/yaml-polymorphic.test.ts`

## Approach

```ts
// Entity base — abstract
abstract class Entity {
  abstract toYamlData(): YamlEntityData;
  static fromYamlData(data: YamlEntityData): Entity { ... }
}

// Each subclass owns its shape
class Klass extends Entity {
  toYamlData(): YamlEntityData {
    return {
      ...super.toYamlData(),
      class_type: this.classType?.toString(),
      superclass: this.superclassIrdi?.toString(),
      is_case_of: this.isCaseOfIrdis.map(i => i.toString()),
      ...
    };
  }
}
```

`yamlEntityFromEntity(entity)` becomes `entity.toYamlData()`. The
switch disappears. Adding a new entity type = adding a new subclass
with its own `toYamlData`/`fromYamlData`.

## Acceptance

- [x] Each Entity subclass has `toYamlData()` / `fromYamlData()`
- [x] YamlEntity.ts dispatches polymorphically (no switch)
- [x] All YAML round-trip tests still pass
- [x] Adding a new entity type requires no edits to YamlEntity.ts

## Dependencies

- TODO.feat/07 (FieldRegistry) — the per-subclass `toYamlData` uses the registry for fields

## Note

This plan is the OCP/MECE fix that justifies the YamlEntity's current
shape. The current switch was acceptable as a porting milestone; it
becomes debt once the field registry lands.
