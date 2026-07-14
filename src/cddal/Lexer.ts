/**
 * CDDAL Lexer — token stream from source text.
 *
 * Ported from Cdd::Cddal::Lexer (lib/cdd/cddal/lexer.rb). Token names
 * match the Ruby implementation 1:1 so the parser can mirror the racc
 * grammar without translation.
 */

export type TokenKind =
  | "META_CLASS"
  | "INSTANCE"
  | "ALIAS"
  | "IMPORT"
  | "TRUE"
  | "FALSE"
  | "NULL"
  | "LBRACE"
  | "RBRACE"
  | "COLON"
  | "COMMA"
  | "LANGLE"
  | "RANGLE"
  | "DOT"
  | "LPAREN"
  | "RPAREN"
  | "EQEQ"
  | "NEQ"
  | "STRING"
  | "NUMBER"
  | "DATE"
  | "IRDI"
  | "IDENT"
  | "EOF";

export interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  readonly line: number;
  readonly column: number;
}

export class LexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LexError";
  }
}

const PUNCTUATION: Readonly<Record<string, TokenKind>> = {
  "{": "LBRACE",
  "}": "RBRACE",
  ":": "COLON",
  ",": "COMMA",
  "<": "LANGLE",
  ">": "RANGLE",
  ".": "DOT",
  "(": "LPAREN",
  ")": "RPAREN",
};

const KEYWORD_MAP: Readonly<Record<string, TokenKind>> = {
  instance: "INSTANCE",
  alias: "ALIAS",
  import: "IMPORT",
  true: "TRUE",
  false: "FALSE",
  null: "NULL",
};

const META_CLASS_KEYWORDS = [
  "property-meta-class",
  "enumeration-meta-class",
  "term-meta-class",
  "meta-class",
];

const IRDI_RE = /[0-9]+\/[0-9]+\/\/\/[A-Za-z0-9_]+(?:_[0-9]+)?#[A-Za-z0-9_]+/;
const LOCAL_REF_RE = /[A-Za-z_][A-Za-z0-9_]*#[A-Za-z0-9_]+(?:##[A-Za-z0-9_]+)?/;
const DATE_RE = /\d{4}-\d{2}-\d{2}/;
const NUMBER_RE = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
const IDENT_RE = /[A-Za-z_][A-Za-z0-9_]*/;
const UNICODE_HEX_RE = /[0-9a-fA-F]{4}/;

export class Lexer {
  private readonly source: string;
  private pos = 0;
  private line = 1;
  private column = 1;
  private cachedTokens: Token[] | null = null;

  constructor(source: string) {
    this.source = source ?? "";
  }

  tokenize(): Token[] {
    if (this.cachedTokens) return this.cachedTokens;
    const tokens: Token[] = [];
    while (true) {
      this.skipInterstitial();
      if (this.pos >= this.source.length) break;
      const tok = this.scanToken();
      if (!tok) {
        const ch = this.source[this.pos] ?? "";
        throw new LexError(
          `unexpected character ${JSON.stringify(ch)} at line ${this.line}, column ${this.column}`,
        );
      }
      tokens.push(tok);
    }
    tokens.push(this.eofToken());
    this.cachedTokens = tokens;
    return tokens;
  }

  private eofToken(): Token {
    return {
      kind: "EOF",
      value: "",
      line: this.line,
      column: this.column,
    };
  }

  private skipInterstitial(): void {
    while (this.pos < this.source.length) {
      const wsMatch = this.matchAt(this.pos, /^[ \t\r]+/);
      if (wsMatch) {
        this.advance(wsMatch.length);
        continue;
      }
      if (this.source[this.pos] === "\n") {
        this.advance(1);
        this.line += 1;
        this.column = 1;
        continue;
      }
      const commentMatch = this.matchAt(this.pos, /^#[^\n]*/);
      if (commentMatch) {
        this.advance(commentMatch.length);
        continue;
      }
      break;
    }
  }

  private scanToken(): Token | null {
    const line = this.line;
    const column = this.column;

    if (this.source[this.pos] === '"') {
      const value = this.scanStringLiteral();
      return { kind: "STRING", value, line, column };
    }

    const eqMatch = this.matchAt(this.pos, /^(==|!=)/);
    if (eqMatch) {
      this.advance(eqMatch.length);
      return {
        kind: eqMatch === "==" ? "EQEQ" : "NEQ",
        value: eqMatch,
        line,
        column,
      };
    }

    const char = this.source[this.pos];
    if (char && PUNCTUATION[char]) {
      this.advance(1);
      return { kind: PUNCTUATION[char], value: char, line, column };
    }

    const mc = this.tryMatchMetaClass();
    if (mc) {
      this.advance(mc.length);
      return { kind: "META_CLASS", value: mc, line, column };
    }

    const irdi = this.matchAt(this.pos, IRDI_RE);
    if (irdi) {
      this.advance(irdi.length);
      return { kind: "IRDI", value: irdi, line, column };
    }

    const local = this.matchAt(this.pos, LOCAL_REF_RE);
    if (local) {
      this.advance(local.length);
      return { kind: "IDENT", value: local, line, column };
    }

    const date = this.matchAt(this.pos, DATE_RE);
    if (date) {
      const next = this.source[this.pos + date.length];
      if (!next || !/[A-Za-z_]/.test(next)) {
        this.advance(date.length);
        return { kind: "DATE", value: date, line, column };
      }
    }

    const num = this.matchAt(this.pos, NUMBER_RE);
    if (num) {
      this.advance(num.length);
      return { kind: "NUMBER", value: num, line, column };
    }

    const ident = this.matchAt(this.pos, IDENT_RE);
    if (ident) {
      this.advance(ident.length);
      const kind = KEYWORD_MAP[ident] ?? "IDENT";
      return { kind, value: ident, line, column };
    }

    return null;
  }

  private tryMatchMetaClass(): string | null {
    for (const keyword of META_CLASS_KEYWORDS) {
      if (this.source.startsWith(keyword, this.pos)) {
        const after = this.source[this.pos + keyword.length];
        if (after && /[A-Za-z0-9_-]/.test(after)) continue;
        return keyword;
      }
    }
    return null;
  }

  private scanStringLiteral(): string {
    this.advance(1);
    const startLine = this.line;
    let buffer = "";
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      this.advance(1);
      if (ch === '"') {
        return buffer;
      }
      if (ch === "\\") {
        const esc = this.source[this.pos];
        if (esc === undefined) {
          throw new LexError(`unterminated escape at line ${this.line}`);
        }
        this.advance(1);
        buffer += this.decodeEscape(esc, startLine);
        continue;
      }
      if (ch === "\n") {
        throw new LexError(`unterminated string at line ${startLine}`);
      }
      buffer += ch;
    }
    throw new LexError(`unterminated string at line ${startLine}`);
  }

  private decodeEscape(esc: string, startLine: number): string {
    switch (esc) {
      case '"':
        return '"';
      case "\\":
        return "\\";
      case "/":
        return "/";
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      case "u": {
        const hex = this.matchAt(this.pos, UNICODE_HEX_RE);
        if (!hex) {
          throw new LexError(`invalid unicode escape at line ${startLine}`);
        }
        this.advance(hex.length);
        return String.fromCodePoint(parseInt(hex, 16));
      }
      default:
        throw new LexError(`invalid escape \\${esc} at line ${startLine}`);
    }
  }

  private matchAt(position: number, pattern: RegExp): string | null {
    const substring = this.source.slice(position);
    const m = substring.match(pattern);
    return m && m.index === 0 ? m[0] : null;
  }

  private advance(n: number): void {
    this.pos += n;
    this.column += n;
  }
}
