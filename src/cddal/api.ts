/**
 * Top-level CDDAL API — matches Ruby's `Opencdd::Cddal` surface.
 *
 *   import { Cddal } from "@opencdd/opencdd";
 *   const db = Cddal.parse(source);
 *   const text = Cddal.serialize(db);
 *
 * Browser-safe. File-based entry points (`parseFile`, `serializeToFile`)
 * arrive in a later PR alongside the Resolver/Fetcher pipeline.
 */

import { Parser } from "./Parser";
import { Builder } from "./Builder";
import { DatabaseSerializer } from "./DatabaseSerializer";
import { Database } from "../models/Database";

export interface ParseOptions {
  database?: Database;
  sourceFile?: string;
}

export const Cddal = {
  parse(source: string, options?: ParseOptions): Database {
    const document = Parser.parse(source);
    const builder = new Builder(options?.database);
    return builder.build(document).database;
  },

  serialize(database: Database): string {
    return new DatabaseSerializer(database).toCddal();
  },
};
