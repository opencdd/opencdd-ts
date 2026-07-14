/**
 * Mermaid classDiagram exporter for CDD databases.
 *
 * Ported from Cdd::Exporters::Mermaid (lib/cdd/exporters/mermaid.rb).
 * Walks the class hierarchy depth-first from each root, emitting:
 *   - one class block per class (with stereotype annotation)
 *   - inheritance edges (parent <|-- child) when a parent is resolvable
 *   - is_case_of dashed edges (powertype composition)
 *
 * The Ruby original resolves `klass.database.find(ref)` — we resolve via
 * the database passed to `toDiagram`, mirroring that contract.
 */

import { Database } from "../models/Database";
import { Klass } from "../models/Klass";
import { byEntityCode } from "./sort";

export class MermaidExporter {
  private readonly lines: string[] = [];
  private readonly emitted = new Set<string>();
  private database: Database | null = null;

  toDiagram(database: Database): string {
    this.lines.length = 0;
    this.emitted.clear();
    this.database = database;
    this.lines.push("classDiagram");
    this.visitClasses(database);
    return uniqueLines(this.lines).join("\n");
  }

  private visitClasses(database: Database): void {
    const roots = [...database.rootClasses()].sort(byEntityCode);
    for (const root of roots) this.visitClass(root);
  }

  private visitClass(klass: Klass): void {
    const key = klass.irdi?.toString();
    if (key && this.emitted.has(key)) return;
    if (key) this.emitted.add(key);
    this.emitClassBlock(klass);
    this.emitInheritanceEdge(klass);
    this.emitIsCaseOfEdges(klass);
    const children = [...klass.children].sort(byEntityCode);
    for (const child of children) this.visitClass(child);
  }

  private emitClassBlock(klass: Klass): void {
    const id = mermaidId(klass);
    this.lines.push(`  class ${id} {`);
    this.lines.push(`    <<${klass.classType?.toString() ?? "ITEM_CLASS"}>>`);
    this.lines.push(`    +code ${klass.code ?? ""}`);
    this.lines.push(`  }`);
    const note = klass.preferredName("en");
    if (note && note.length > 0)
      this.lines.push(`  ${id} : ${quoteLabel(note)}`);
  }

  private emitInheritanceEdge(klass: Klass): void {
    const parentRef = klass.parentIrdi ?? klass.superclassIrdi;
    if (parentRef === null) return;
    const parent = this.database?.resolveReference(parentRef.toString());
    if (!(parent instanceof Klass)) return;
    this.lines.push(`  ${mermaidId(parent)} <|-- ${mermaidId(klass)}`);
  }

  private emitIsCaseOfEdges(klass: Klass): void {
    for (const ref of klass.isCaseOfIrdis) {
      const target = this.database?.resolveReference(ref.toString());
      if (!(target instanceof Klass)) continue;
      this.lines.push(
        `  ${mermaidId(target)} <.. ${mermaidId(klass)} : is_case_of`,
      );
    }
  }
}

function mermaidId(klass: Klass): string {
  const code = klass.code?.toString() ?? "";
  if (code.length === 0) {
    const raw = klass.irdi?.toString() ?? "";
    return `Class_${raw.replace(/[^A-Za-z0-9]/g, "_")}`;
  }
  return code.replace(/[^A-Za-z0-9_]/g, "_");
}

function quoteLabel(text: string): string {
  return text.includes(":") ? JSON.stringify(text) : text;
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}
