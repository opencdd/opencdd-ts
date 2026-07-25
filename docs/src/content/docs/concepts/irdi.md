---
title: IRDI
description: The International Registration Data Identifier — globally unique addressing for every CDD entity.
published: 2026-07-25
section: Concepts
order: 30
---

IRDIs (International Registration Data Identifiers, ISO/IEC 11179-6)
are how CDD addresses every entity globally. This page covers the
TS-specific parsing rules; for the conceptual background see the
[opencdd-ruby IRDI doc](https://opencdd.github.io/opencdd-ruby/docs/concepts/irdi/).

## Forms

The TS `IRDI` class accepts three input forms:

### Full

```
0112/2///61360_4#AAA001
```

Format: `registrant/semantic///scheme#code[##smver]`.

### Short

```
AAA001
```

A bare code — no registrant or scheme. Used in internal references
where context disambiguates.

### Tree path (Domino URL form)

```
0112-2---61360_4%23AAA001
```

Used in cdd.iec.ch Domino page URLs. `-` separates path segments
where IRDI uses `/`, and `%23` is URL-encoded `#`.

## Parsing

```ts
import { IRDI } from "@opencdd/opencdd";

const irdi = IRDI.parse("0112/2///61360_4#AAA001");
// → IRDI { registrant: "0112", semantic: "2", scheme: "61360_4", code: "AAA001" }

irdi?.registrant  // "0112"
irdi?.scheme      // "61360_4"
irdi?.code        // "AAA001"
irdi?.version     // null

irdi?.toString()       // "0112/2///61360_4#AAA001"
irdi?.toTreePath()     // "0112-2---61360_4%23AAA001"
```

`IRDI.parse` returns `null` for null/empty input. For any non-empty
input it falls back to the short form, so even unrecognised strings
become valid short IRDIs.

## Equality

```ts
const a = IRDI.parse("0112/2///61360_4#AAA001")!;
const b = IRDI.parse("0112-2---61360_4%23AAA001")!;

a.equals(b)  // true — tree path normalises to full
```

IRDIs are frozen and hashed, so they work as `Map` keys.

## Lookup

The `Database` indexes entities by IRDI:

```ts
const prop = db.findByIrdi(IRDI.parse("0112/2///61360_4#AAI005")!);
```

See the [API reference](/docs/reference/api/) for the full lookup API.
