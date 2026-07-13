/**
 * CDDAL module resolution — port of Ruby's Opencdd::Cddal::Resolver
 * (lib/opencdd/cddal/resolver.rb) and Opencdd::Cddal::Fetcher.
 *
 * Browser-safe: all I/O goes through a pluggable Fetcher. The default
 * InMemoryFetcher returns null for every specifier (imports silently
 * skip). Callers who want real resolution supply their own Fetcher
 * (e.g. one pre-populated by an async pre-fetch in the browser, or
 * a Node-only fs-backed Fetcher in `@opencdd/opencdd/node`).
 *
 * Resolution rules mirror Ruby's:
 *   1. URL (http://, https://, file://) — fetched via Fetcher; URL is canonical.
 *   2. Absolute path — read via Fetcher; specifier is canonical.
 *   3. Relative path (./ or ../) — resolved against importingFile's dir
 *      (or basePath), then looked up in the Fetcher.
 *   4. Bare name — searched in searchPath entries, then basePath.
 *
 * In non-strict mode (default), misses return null + a warning. In
 * strict mode, they throw ImportError.
 */

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

export interface Fetcher {
  fetch(specifier: string): string | null;
}

export class InMemoryFetcher implements Fetcher {
  constructor(
    private readonly sources: Readonly<Record<string, string>> = {},
  ) {}

  fetch(specifier: string): string | null {
    return this.sources[specifier] ?? null;
  }
}

export interface ResolveResult {
  readonly canonical: string;
  readonly source: string;
}

export interface ResolverOptions {
  readonly fetcher?: Fetcher;
  readonly basePath?: string;
  readonly searchPath?: readonly string[];
  readonly strict?: boolean;
  readonly quiet?: boolean;
}

export class Resolver {
  readonly fetcher: Fetcher;
  readonly basePath: string;
  readonly searchPath: readonly string[];
  readonly strict: boolean;
  readonly quiet: boolean;

  constructor(opts: ResolverOptions = {}) {
    this.fetcher = opts.fetcher ?? new InMemoryFetcher();
    this.basePath = opts.basePath ?? ".";
    this.searchPath = opts.searchPath ?? [];
    this.strict = opts.strict ?? false;
    this.quiet = opts.quiet ?? false;
  }

  resolve(specifier: string, importingFile?: string): ResolveResult | null {
    try {
      if (isUrl(specifier)) {
        const source = this.fetcher.fetch(specifier);
        if (source === null)
          throw new ImportError(
            `cannot fetch URL ${JSON.stringify(specifier)}`,
          );
        return { canonical: specifier, source };
      }
      const candidates = this.pathCandidates(specifier, importingFile);
      for (const cand of candidates) {
        const source = this.fetcher.fetch(cand);
        if (source !== null) return { canonical: cand, source };
      }
      throw new ImportError(
        `cannot resolve import ${JSON.stringify(specifier)} (searched: ${candidates.join(", ") || "(no candidates)"})`,
      );
    } catch (err) {
      if (err instanceof ImportError) {
        if (this.strict) throw err;
        if (!this.quiet) console.warn(`CDDAL: ${err.message}`);
        return null;
      }
      throw err;
    }
  }

  private pathCandidates(specifier: string, importingFile?: string): string[] {
    if (isAbsolute(specifier)) {
      return [normalizePath(specifier)];
    }
    if (isRelative(specifier)) {
      const base = importingFile ? dirname(importingFile) : this.basePath;
      return [normalizePath(`${base}/${specifier}`)];
    }
    return [
      ...this.searchPath.map((sp) => normalizePath(`${sp}/${specifier}`)),
      normalizePath(`${this.basePath}/${specifier}`),
    ];
  }
}

function isUrl(s: string): boolean {
  return /^https?:\/\//.test(s) || /^file:\/\//.test(s);
}

function isAbsolute(s: string): boolean {
  return s.startsWith("/");
}

function isRelative(s: string): boolean {
  return s.startsWith("./") || s.startsWith("../");
}

function dirname(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx < 0 ? "." : path.slice(0, idx) || "/";
}

function normalizePath(path: string): string {
  const segs = path.split("/");
  const out: string[] = [];
  for (const seg of segs) {
    if (seg === "") {
      if (out.length === 0) out.push(""); // preserve leading slash
      continue;
    }
    if (seg === ".") continue;
    if (seg === "..") {
      if (out.length > 1) out.pop();
      continue;
    }
    out.push(seg);
  }
  const result = out.join("/");
  return result === "" ? "/" : result;
}
