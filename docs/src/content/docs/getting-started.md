---
title: Getting started
description: A 10-minute walkthrough — install the package, load a dictionary, walk the entity graph, emit JSON.
published: 2026-07-25
section: Getting Started
order: 10
---

This guide takes about 10 minutes. By the end you'll know how to
install `@opencdd/opencdd`, load a CDD dictionary, navigate the
entity graph, and emit output.

## What is CDD?

The **Common Data Dictionary (CDD)** is a four-layer ontology
standardised by IEC 61360 / 62656-1. It's used to publish engineering
dictionaries — product classes, materials, quantities, units — in a
shared, IRDI-addressable form. The canonical public instance is
[`cdd.iec.ch`](https://cdd.iec.ch).

If you're new to CDD, read the [ontology overview](/docs/ontology/)
first — especially the part about powertypes, which makes CDD
unusual among modelling standards.

## Install

```bash
npm install @opencdd/opencdd
```

Requires Node.js ≥ 18 and a bundler (Vite, Webpack, esbuild, Rollup).
The package uses extensionless ESM imports with
`moduleResolution: Bundler`; pure-Node consumers without a bundler
are not currently supported.

```ts
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "Bundler",
    "module": "ESNext",
    "target": "ES2022"
  }
}
```

## Get a database file

The TS package consumes `database.json` produced by the Ruby gem.
The fastest way to get one is to run the Ruby gem against your
Parcel xlsx or CDDAL data:

```bash
# In the Ruby gem
gem install opencdd
opencdd export my_dict.xlsx --format json -o database.json
```

If you just want to try the package without installing Ruby, the
[OpenCDD Browser repo](https://github.com/opencdd/opencdd.github.io)
ships sample `database.json` snapshots for IEC 61360, IEC 61987,
and IEC 62683.

## Load and walk

```ts
import { readFileSync } from "node:fs";
import { Database, EffectiveProperties } from "@opencdd/opencdd";

const raw = JSON.parse(readFileSync("./database.json", "utf8"));
const db = Database.fromJSON(raw);

const root = db.classes.find((c) => c.superclassIrdi === null);
console.log(`Root class: ${root?.preferredName("en")} (${root?.code})`);

// Walk effective properties (declared + inherited)
const effective = new EffectiveProperties(db);
for (const prop of effective.propertiesOf(root!)) {
  console.log(`  - ${prop.code}: ${prop.preferredName("en")}`);
}

// Walk subclasses
for (const klass of db.classes) {
  if (klass.superclassIrdi?.equals(root!.irdi!)) {
    console.log(`Subclass: ${klass.preferredName("en")}`);
  }
}
```

## Query by IRDI

Every CDD entity has an IRDI — a globally unique identifier. The
`Database` indexes entities by IRDI for O(1) lookup:

```ts
import { IRDI, Database } from "@opencdd/opencdd";

const prop = db.findByIrdi(IRDI.parse("0112/2///61360_4#AAI005")!);
if (prop) {
  console.log(prop.preferredName("en"));
  console.log(prop.definition("en"));
}
```

## Validate

```ts
import { Database, Validators } from "@opencdd/opencdd";

const errors = Validators.runValidation(db);
for (const err of errors) {
  console.warn(`${err.ruleId}: ${err.message}`);
}
```

See the [validator rules reference](/docs/reference/validator-rules/)
for what each rule checks.

## Emit

```ts
import { JsonExporter, YamlExporter, MermaidExporter } from "@opencdd/opencdd";

// JSON (canonical handoff format)
const json = new JsonExporter().export(db);

// Mermaid class diagram
const diagram = new MermaidExporter().export(db);
console.log(diagram);
```

## Next steps

- [Architecture](/docs/architecture/) — how the package is structured.
- [API reference](/docs/reference/api/) — full symbol list.
- [Validator rules](/docs/reference/validator-rules/) — R01–R14.
