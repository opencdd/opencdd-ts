/**
 * Top-level CDDAL API — matches Ruby's `Opencdd::Cddal` surface.
 *
 *   import { Cddal } from "@opencdd/opencdd";
 *   const db   = Cddal.parse(source);
 *   const text = Cddal.serialize(db);
 *
 * `parseFile` and `serializeToFile` are Node-only (use `node:fs/promises`
 * via dynamic import). In a browser bundle they throw at call time.
 */

import { Parser } from "./Parser";
import { Builder, type BuildResult } from "./Builder";
import { DatabaseSerializer } from "./DatabaseSerializer";
import { Database } from "../models/Database";
import { Resolver, type ResolverOptions, type Fetcher } from "./Resolver";

export interface ParseOptions {
  readonly database?: Database;
  readonly resolver?: Resolver;
  readonly fetcher?: Fetcher;
  readonly sourceFile?: string;
}

export const Cddal = {
  parse(source: string, options?: ParseOptions): Database {
    return this.parseWithResult(source, options).database;
  },

  parseWithResult(source: string, options?: ParseOptions): BuildResult {
    const document = Parser.parse(source);
    const resolver =
      options?.resolver ??
      (options?.fetcher
        ? new Resolver({ fetcher: options.fetcher })
        : undefined) ??
      new Resolver();
    const builder = new Builder({
      database: options?.database,
      resolver,
      sourceFile: options?.sourceFile,
    });
    return builder.build(document);
  },

  serialize(database: Database): string {
    return new DatabaseSerializer(database).toCddal();
  },

  async parseFile(path: string, options?: ParseOptions): Promise<Database> {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(path, "utf8");
    return this.parse(source, {
      ...options,
      sourceFile: options?.sourceFile ?? path,
    });
  },

  async serializeToFile(database: Database, path: string): Promise<void> {
    const { writeFile } = await import("node:fs/promises");
    const text = this.serialize(database);
    await writeFile(path, text, "utf8");
  },
};

export {
  Resolver,
  ImportError,
  InMemoryFetcher,
  type Fetcher,
  type ResolverOptions,
  type ResolveResult,
} from "./Resolver";
