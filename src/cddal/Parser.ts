/**
 * CDDAL Parser — recursive-descent over the lexer token stream.
 *
 * Hand-rolled port of the racc grammar in lib/cdd/cddal/cddal.y
 * (24 productions). The grammar is small and stable; a parser
 * generator would add build complexity without commensurate benefit.
 *
 * Production names mirror the racc rule names so cross-reference
 * against the Ruby grammar is direct.
 */

import { Lexer, type Token, type TokenKind } from "./Lexer";
import * as AST from "./AST";
import type {
  AliasDecl,
  Declaration,
  Document,
  ImportDecl,
  ImportedName,
  InstanceDecl,
  MetaClassDecl,
  PropertyAssignment,
  ValueNode,
} from "./AST";

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

export class Parser {
  static parse(source: string): Document {
    const tokens = new Lexer(source).tokenize();
    return new Parser(tokens).parseDocument();
  }

  private pos = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  parseDocument(): Document {
    const declarations: Declaration[] = [];
    while (!this.at("EOF")) {
      declarations.push(this.parseDeclaration());
    }
    this.expect("EOF");
    return AST.documentOf(declarations);
  }

  private parseDeclaration(): Declaration {
    if (this.at("META_CLASS")) return this.parseMetaClassDecl();
    if (this.at("INSTANCE")) return this.parseInstanceDecl();
    if (this.at("ALIAS")) return this.parseAliasDecl();
    if (this.at("IMPORT")) return this.parseImportDecl();
    if (this.peekIdent("from")) return this.parseImportDecl();
    throw this.unexpected("declaration");
  }

  private parseMetaClassDecl(): MetaClassDecl {
    const start = this.expect("META_CLASS");
    const irdi = this.parseIdentOrIrdi();
    const propertyIdentifiers = this.parseOptPropList();
    return {
      node: "meta_class_decl",
      irdi,
      propertyIdentifiers,
      line: start.line,
    };
  }

  private parseOptPropList(): string[] {
    if (!this.at("LBRACE")) return [];
    this.expect("LBRACE");
    const ids: string[] = [];
    while (this.at("IDENT")) {
      ids.push(this.advance().value);
    }
    this.expect("RBRACE");
    return ids;
  }

  private parseInstanceDecl(): InstanceDecl {
    const start = this.expect("INSTANCE");
    if (this.peek().kind === "LANGLE") {
      this.expect("LANGLE");
      const metaClassRef = this.parseIdentOrIrdi();
      const assignments = this.parseOptAssignmentBlock();
      return {
        node: "instance_decl",
        name: null,
        metaClassRef,
        assignments,
        line: start.line,
      };
    }
    const name = this.expectIdent();
    this.expect("LANGLE");
    const metaClassRef = this.parseIdentOrIrdi();
    const assignments = this.parseOptAssignmentBlock();
    return {
      node: "instance_decl",
      name,
      metaClassRef,
      assignments,
      line: start.line,
    };
  }

  private parseOptAssignmentBlock(): PropertyAssignment[] {
    if (!this.at("LBRACE")) return [];
    this.expect("LBRACE");
    const assignments: PropertyAssignment[] = [];
    while (this.at("IDENT")) {
      assignments.push(this.parseAssignment());
    }
    this.expect("RBRACE");
    return assignments;
  }

  private parseAssignment(): PropertyAssignment {
    const start = this.expect("IDENT");
    const languageTag = this.parseOptLanguageTag();
    this.expect("COLON");
    const value = this.parseValue();
    return AST.propertyAssignment(start.value, value, languageTag, start.line);
  }

  private parseOptLanguageTag(): string | null {
    if (!this.at("DOT")) return null;
    this.expect("DOT");
    return this.expectIdent();
  }

  private parseAliasDecl(): AliasDecl {
    const start = this.expect("ALIAS");
    const aliasName = this.expectIdent();
    this.expect("COLON");
    const propertyId = this.parseIdentOrIrdi();
    return {
      node: "alias_decl",
      aliasName,
      propertyId,
      line: start.line,
    };
  }

  private parseImportDecl(): ImportDecl {
    if (this.peekIdent("from")) {
      return this.parseSelectiveImport();
    }
    const start = this.expect("IMPORT");
    if (this.peekIdent("from")) {
      this.pos -= 1;
      return this.parseSelectiveImport();
    }
    const specifier = this.expect("STRING").value;
    if (this.peekIdent("as")) {
      this.advance();
      const qualifier = this.expectIdent();
      return AST.importQualified(specifier, qualifier, start.line);
    }
    return AST.importBare(specifier, start.line);
  }

  private parseSelectiveImport(): ImportDecl {
    const start = this.expect("IDENT");
    if (start.value !== "from") {
      throw this.unexpected("from");
    }
    const specifier = this.expect("STRING").value;
    if (!this.peekKeyword("import")) {
      throw this.unexpected("import");
    }
    this.advance();
    this.expect("LBRACE");
    const names: ImportedName[] = [];
    if (!this.at("RBRACE")) {
      names.push(this.parseImportedName());
      while (this.at("COMMA")) {
        this.advance();
        names.push(this.parseImportedName());
      }
    }
    this.expect("RBRACE");
    return AST.importSelective(specifier, names, start.line);
  }

  private parseImportedName(): ImportedName {
    const name = this.expectIdent();
    if (this.peekIdent("as")) {
      this.advance();
      const localName = this.expectIdent();
      return { name, localName };
    }
    return { name, localName: name };
  }

  private parseIdentOrIrdi(): string {
    const tok = this.peek();
    if (tok.kind === "IDENT" || tok.kind === "IRDI") {
      this.advance();
      return tok.value;
    }
    throw this.unexpected("IDENT or IRDI");
  }

  private parseValue(): ValueNode {
    const tok = this.peek();
    switch (tok.kind) {
      case "STRING":
        this.advance();
        return AST.literal("string", tok.value);
      case "NUMBER":
        this.advance();
        return AST.literal("number", tok.value);
      case "DATE":
        this.advance();
        return AST.literal("date", tok.value);
      case "TRUE":
        this.advance();
        return AST.literal("boolean", "true");
      case "FALSE":
        this.advance();
        return AST.literal("boolean", "false");
      case "NULL":
        this.advance();
        return AST.literal("null", "null");
      case "IRDI":
        this.advance();
        return AST.identifierRef(tok.value);
      case "LBRACE":
        return this.parseSet();
      case "LPAREN":
        return this.parseTuple();
      case "IDENT":
        return this.parseIdentLedValue();
      default:
        throw this.unexpected("value");
    }
  }

  private parseIdentLedValue(): ValueNode {
    const name = this.expectIdent();
    if (this.at("EQEQ") || this.at("NEQ")) {
      const opTok = this.advance();
      const operator = opTok.kind === "EQEQ" ? "==" : "!=";
      const right = this.parseConditionRhs();
      return AST.condition(name, operator, right);
    }
    if (this.at("LPAREN")) {
      this.expect("LPAREN");
      const argument = this.parseClassRefArg();
      this.expect("RPAREN");
      return AST.classReference(name, argument);
    }
    if (this.at("DOT")) {
      this.expect("DOT");
      const field = this.expectIdent();
      return AST.identifierRef(field, name);
    }
    return AST.identifierRef(name);
  }

  private parseConditionRhs(): ValueNode {
    const tok = this.peek();
    switch (tok.kind) {
      case "STRING":
        this.advance();
        return AST.literal("string", tok.value);
      case "NUMBER":
        this.advance();
        return AST.literal("number", tok.value);
      case "IDENT":
        this.advance();
        return AST.identifierRef(tok.value);
      case "IRDI":
        this.advance();
        return AST.identifierRef(tok.value);
      case "LBRACE":
        return this.parseSet();
      default:
        throw this.unexpected("condition value");
    }
  }

  private parseClassRefArg(): ValueNode {
    const tok = this.peek();
    switch (tok.kind) {
      case "IDENT":
        this.advance();
        return AST.identifierRef(tok.value);
      case "IRDI":
        this.advance();
        return AST.identifierRef(tok.value);
      case "STRING":
        this.advance();
        return AST.literal("string", tok.value);
      default:
        throw this.unexpected("class reference argument");
    }
  }

  private parseSet(): AST.SetNode {
    this.expect("LBRACE");
    const elements: ValueNode[] = [];
    if (!this.at("RBRACE")) {
      elements.push(this.parseSetElement());
      while (this.at("COMMA")) {
        this.advance();
        elements.push(this.parseSetElement());
      }
    }
    this.expect("RBRACE");
    return AST.setNode(elements);
  }

  private parseSetElement(): ValueNode {
    const tok = this.peek();
    switch (tok.kind) {
      case "STRING":
        this.advance();
        return AST.literal("string", tok.value);
      case "NUMBER":
        this.advance();
        return AST.literal("number", tok.value);
      case "IRDI":
        this.advance();
        return AST.identifierRef(tok.value);
      case "LBRACE":
        return this.parseSet();
      case "LPAREN":
        return this.parseTuple();
      case "IDENT":
        return this.parseIdentLedValue();
      default:
        throw this.unexpected("set element");
    }
  }

  private parseTuple(): AST.TupleNode {
    this.expect("LPAREN");
    const elements: ValueNode[] = [this.parseTupleElement()];
    while (this.at("COMMA")) {
      this.advance();
      elements.push(this.parseTupleElement());
    }
    this.expect("RPAREN");
    return AST.tupleNode(elements);
  }

  private parseTupleElement(): ValueNode {
    const tok = this.peek();
    switch (tok.kind) {
      case "STRING":
        this.advance();
        return AST.literal("string", tok.value);
      case "NUMBER":
        this.advance();
        return AST.literal("number", tok.value);
      case "IRDI":
        this.advance();
        return AST.identifierRef(tok.value);
      case "IDENT":
        this.advance();
        return AST.identifierRef(tok.value);
      default:
        throw this.unexpected("tuple element");
    }
  }

  private expectIdent(expected?: string): string {
    const tok = this.peek();
    if (tok.kind !== "IDENT") {
      throw this.unexpected(expected ?? "IDENT");
    }
    if (expected !== undefined && tok.value !== expected) {
      throw this.unexpected(expected);
    }
    this.advance();
    return tok.value;
  }

  private peekIdent(value: string): boolean {
    const tok = this.peek();
    return tok.kind === "IDENT" && tok.value === value;
  }

  private peekKeyword(value: string): boolean {
    const tok = this.peek();
    return (
      tok.value === value &&
      (tok.kind === "IDENT" ||
        tok.kind === "IMPORT" ||
        tok.kind === "INSTANCE" ||
        tok.kind === "ALIAS" ||
        tok.kind === "META_CLASS")
    );
  }

  private expect(kind: TokenKind): Token {
    const tok = this.peek();
    if (tok.kind !== kind) {
      throw this.unexpected(String(kind));
    }
    this.advance();
    return tok;
  }

  private at(kind: TokenKind): boolean {
    return this.peek().kind === kind;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? EOF_TOKEN;
  }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    if (tok) this.pos += 1;
    return tok ?? EOF_TOKEN;
  }

  private unexpected(expected: string): ParseError {
    const tok = this.peek();
    return new ParseError(
      `expected ${expected} but found ${tok.kind}(${JSON.stringify(tok.value)}) at line ${tok.line}`,
    );
  }
}

const EOF_TOKEN: Token = {
  kind: "EOF",
  value: "",
  line: 0,
  column: 0,
};
