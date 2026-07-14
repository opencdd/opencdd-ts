import { IRDI } from "../models/IRDI";
import {
  entityTypeFor,
  type EntityType,
} from "../models/MetaClasses.generated";

const DIRECTIVE_REGEX = /^#([^:=\s]+)\s*:=\s*(.*)$/;

export class ParcelMetadata {
  private readonly directives = new Map<string, string>();
  private metaClassRaw: string | null = null;

  static fromDirective(cell: string | null | undefined): ParcelMetadata | null {
    if (cell === null || cell === undefined) return null;
    const s = String(cell).trim();
    if (s.length === 0 || !DIRECTIVE_REGEX.test(s)) return null;
    return new ParcelMetadata(s);
  }

  constructor(source: string | null | undefined = null) {
    if (source) this.add(source);
  }

  add(cell: string | null | undefined): string | null {
    if (cell === null || cell === undefined) return null;
    const m = DIRECTIVE_REGEX.exec(String(cell).trim());
    if (!m) return null;
    const key = m[1];
    const val = m[2];
    this.directives.set(key, val);
    if (key === "CLASS_ID") this.metaClassRaw = val;
    return val;
  }

  get(key: string): string | undefined {
    return this.directives.get(key);
  }

  has(key: string): boolean {
    return this.directives.has(key);
  }

  get size(): number {
    return this.directives.size;
  }

  get metaClassIrdi(): IRDI | null {
    if (this.metaClassRaw === null || this.metaClassRaw.length === 0)
      return null;
    return IRDI.parse(this.synthesizeMetaClassIrdi());
  }

  get metaClassCode(): string | undefined {
    return this.metaClassIrdi?.code ?? undefined;
  }

  get type(): EntityType | undefined {
    const code = this.metaClassCode;
    if (!code) return undefined;
    const irdi = this.metaClassIrdi?.toString();
    return irdi ? entityTypeFor(irdi) : undefined;
  }

  className(lang = "en"): string | undefined {
    return this.directives.get(`CLASS_NAME.${lang}`);
  }

  classDefinition(lang = "en"): string | undefined {
    return this.directives.get(`CLASS_DEFINITION.${lang}`);
  }

  classNote(lang = "en"): string | undefined {
    return this.directives.get(`CLASS_NOTE.${lang}`);
  }

  get sourceLanguage(): string | undefined {
    return this.directives.get("SOURCE_LANGUAGE");
  }

  get defaultSupplier(): string | undefined {
    return this.directives.get("DEFAULT_SUPPLIER");
  }

  get defaultVersion(): string | undefined {
    return this.directives.get("DEFAULT_VERSION");
  }

  each(callback: (key: string, value: string) => void): void {
    this.directives.forEach((v, k) => callback(k, v));
  }

  private synthesizeMetaClassIrdi(): string {
    const raw = this.metaClassRaw ?? "";
    if (raw.includes("#")) return raw;
    const supplier = (this.directives.get("DEFAULT_SUPPLIER") ?? "").trim();
    if (supplier.length === 0) return raw;
    return `${supplier}#${raw}`;
  }
}
