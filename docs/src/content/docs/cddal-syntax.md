---
title: CDDAL syntax
description: The CDD Algebraic Language — the canonical plain-text format for CDD content.
published: 2026-07-25
section: Reference
order: 10
---

CDDAL (CDD Algebraic Language) is the canonical plain-text format
for CDD content. This page is a TS-specific summary; for the full
syntax walkthrough see the
[opencdd-ruby CDDAL doc](https://opencdd.github.io/opencdd-ruby/docs/cddal-syntax/).

## Round-trip guarantee

Every CDDAL fixture in `tests/fixtures/` must round-trip identically:
parse → serialize → byte-identical output. This is enforced by the
`oceanrunner-roundtrip.test.ts` test.

## Parsing

```ts
import { Parser } from "@opencdd/opencdd";

const ast = Parser.parse(cddalString);
```

Returns an AST (`AST.Document` and friends from `src/cddal/AST.ts`).
Throws `ParserError` on malformed input.

## Serializing

```ts
import { Builder } from "@opencdd/opencdd";

const cddal = Builder.build(ast);
```

The `Builder` walks the AST and emits canonical CDDAL text.

## Grammar sketch

```
document        := header? entity*
header          := "%version" version "%dictionary" irdi
entity          := entity_type irdi "{" field* "}"
field           := key ":" value ("," value)*
value           := scalar | irdi | set
set             := "{" element ("," element)* "}"
```

For the full grammar, see the
[Ruby CDDAL doc](https://opencdd.github.io/opencdd-ruby/docs/cddal-syntax/).
