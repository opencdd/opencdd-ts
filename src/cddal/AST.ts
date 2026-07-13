/**
 * CDDAL AST — parsed representation of a CDDAL document.
 *
 * Ported from Cdd::Cddal::AST (lib/cdd/cddal/ast.rb). Discriminated
 * unions keep the TS port statically typed while mirroring the Ruby
 * Struct-based shapes one-to-one.
 */

export type LiteralKind = "string" | "number" | "date" | "boolean" | "null";

export interface Literal {
  readonly node: "literal";
  readonly kind: LiteralKind;
  readonly raw: string;
}

export interface IdentifierRef {
  readonly node: "identifier_ref";
  readonly name: string;
  readonly owner: string | null;
}

export interface SetNode {
  readonly node: "set";
  readonly elements: readonly ValueNode[];
}

export interface TupleNode {
  readonly node: "tuple";
  readonly elements: readonly ValueNode[];
}

export interface ClassReferenceNode {
  readonly node: "class_reference";
  readonly typeName: string;
  readonly argument: ValueNode;
}

export interface ConditionNode {
  readonly node: "condition";
  readonly left: string;
  readonly operator: "==" | "!=";
  readonly right: ValueNode;
}

export type ValueNode =
  | Literal
  | IdentifierRef
  | SetNode
  | TupleNode
  | ClassReferenceNode
  | ConditionNode;

export interface PropertyAssignment {
  readonly identifier: string;
  readonly languageTag: string | null;
  readonly value: ValueNode;
  readonly line: number;
}

export interface MetaClassDecl {
  readonly node: "meta_class_decl";
  readonly irdi: string;
  readonly propertyIdentifiers: readonly string[];
  readonly line: number;
}

export interface InstanceDecl {
  readonly node: "instance_decl";
  readonly name: string | null;
  readonly metaClassRef: string;
  readonly assignments: readonly PropertyAssignment[];
  readonly line: number;
}

export interface AliasDecl {
  readonly node: "alias_decl";
  readonly aliasName: string;
  readonly propertyId: string;
  readonly line: number;
}

export type ImportKind = "bare" | "qualified" | "selective";

export interface ImportedName {
  readonly name: string;
  readonly localName: string;
}

export interface ImportDecl {
  readonly node: "import_decl";
  readonly specifier: string;
  readonly kind: ImportKind;
  readonly qualifier: string | null;
  readonly importedNames: readonly ImportedName[];
  readonly line: number;
}

export type Declaration = MetaClassDecl | InstanceDecl | AliasDecl | ImportDecl;

export interface Document {
  readonly node: "document";
  readonly declarations: readonly Declaration[];
}

export function literal(kind: LiteralKind, raw: string): Literal {
  return { node: "literal", kind, raw };
}

export function identifierRef(
  name: string,
  owner: string | null = null,
): IdentifierRef {
  return { node: "identifier_ref", name, owner };
}

export function setNode(elements: readonly ValueNode[]): SetNode {
  return { node: "set", elements };
}

export function tupleNode(elements: readonly ValueNode[]): TupleNode {
  return { node: "tuple", elements };
}

export function classReference(
  typeName: string,
  argument: ValueNode,
): ClassReferenceNode {
  return { node: "class_reference", typeName, argument };
}

export function condition(
  left: string,
  operator: "==" | "!=",
  right: ValueNode,
): ConditionNode {
  return { node: "condition", left, operator, right };
}

export function propertyAssignment(
  identifier: string,
  value: ValueNode,
  languageTag: string | null,
  line: number,
): PropertyAssignment {
  return { identifier, languageTag, value, line };
}

export function importBare(specifier: string, line: number): ImportDecl {
  return {
    node: "import_decl",
    specifier,
    kind: "bare",
    qualifier: null,
    importedNames: [],
    line,
  };
}

export function importQualified(
  specifier: string,
  qualifier: string,
  line: number,
): ImportDecl {
  return {
    node: "import_decl",
    specifier,
    kind: "qualified",
    qualifier,
    importedNames: [],
    line,
  };
}

export function importSelective(
  specifier: string,
  importedNames: readonly ImportedName[],
  line: number,
): ImportDecl {
  return {
    node: "import_decl",
    specifier,
    kind: "selective",
    qualifier: null,
    importedNames,
    line,
  };
}

export function documentOf(declarations: readonly Declaration[]): Document {
  return { node: "document", declarations };
}

export function isMetaClassDecl(d: Declaration): d is MetaClassDecl {
  return d.node === "meta_class_decl";
}

export function isInstanceDecl(d: Declaration): d is InstanceDecl {
  return d.node === "instance_decl";
}

export function isAliasDecl(d: Declaration): d is AliasDecl {
  return d.node === "alias_decl";
}

export function isImportDecl(d: Declaration): d is ImportDecl {
  return d.node === "import_decl";
}
