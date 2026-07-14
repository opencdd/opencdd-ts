/**
 * CDDAL ValueSerializer — pure-function conversion of AST value nodes
 * to their CDDAL wire-format strings.
 *
 * Ported from Opencdd::Cddal::ValueSerializer
 * (lib/opencdd/cddal/value_serializer.rb). Stateless — safe to call
 * from any context. The Builder and the AST-level Serializer both
 * delegate here so they share identical value formatting.
 *
 * Single source of truth for: literal raw passthrough, identifier-ref
 * qualification, set/tuple brace formatting, class-reference argument
 * formatting, condition-operator spacing.
 */

import type { ValueNode, IdentifierRef } from "./AST";

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

export function serializeIdentifierRef(ref: IdentifierRef): string {
  return ref.owner ? `${ref.owner}.${ref.name}` : ref.name;
}
