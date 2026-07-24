# @opencdd/opencdd

TypeScript port of the canonical Ruby [`opencdd`](https://github.com/opencdd/opencdd-ruby) gem — reads CDD data (CDDAL + YAML) and outputs CDDAL. Shared model layer between the [OpenCDD Browser](https://github.com/opencdd/opencdd.github.io) and the [OpenCDD Editor](https://github.com/opencdd/editor).

## What's in here

- **Value objects** — `Entity`, `Klass`, `Property`, `Unit`, `ValueList`, `ValueTerm`, `Relation`, `ViewControl`, `AliasTable`, `MetaClass`, `ClassType`, `PropertyDataTypeElement`, `ValueFormat`, `IRDI`, `DataType` (with `SimpleDataType`, `RealMeasureType`, `IntegerMeasureType`, `ClassReference`, `EnumStringType`, `EnumReferenceType`).
- **Database** — in-memory store with `finalize`, `merge`, `renameEntity`, `removeEntity`, `propertiesOf`, semantic equality.
- **Tree walkers** — `ClassTree`, `RelationTree`, `CompositionTree`, `EffectiveProperties`.
- **Utilities** — `Guid`, `InstanceRule`, `StructuredValues` (7 parser/serializer pairs).
- **CDDAL** — plain-text canonical format: `Lexer`, `Parser`, `Serializer`, `Builder`, `DatabaseSerializer`.
- **Parcel** — sheet schema: `ParcelMetadata`, `SheetSchema`, `Sheet`, `Workbook`, `canonicalParcelId`.
- **Exporters** — `JsonExporter`, `YamlExporter`, `MermaidExporter`, `CsvWriter` (browser-friendly ports of the Ruby exporters).
- **Validators** (exported as `Validators.*`) — TS Runner + all Ruby rules R01–R14, including the R14 composition-cycle check.

## Install

```bash
npm install @opencdd/opencdd
```

## Quick example

```ts
import {
  Klass,
  Property,
  Database,
  ENTITY_CONSTRUCTORS,
} from "@opencdd/opencdd";

const klass = new Klass({
  irdi: "0112/2///61360_4#AAA001",
  code: "AAA001",
  preferredName: "Vehicle",
});

const db = new Database();
db.addEntity(klass);
db.finalize();

console.log(db.classes.size); // 1
```

## Codegen provenance

`src/models/PropertyIds.generated.ts` and `src/models/MetaClasses.generated.ts` are **generated** by the Ruby `opencdd` gem's `rake generate_ts` task, which writes them into this repo via a git submodule of `data-private`. Do not hand-edit. See the codegen contract documentation for the codegen contract.

## Versioning

Semver. The model layer mirrors the Ruby gem's semantics; breaking changes to the gem's public API surface are breaking changes here.

## License

MIT. See [LICENSE](LICENSE).
