/**
 * Languages value object — the language configuration of a CDD dictionary.
 *
 * Ported from Cdd::Languages (lib/cdd/languages.rb). The source language
 * is the one the data was originally authored in; translation languages
 * are additional languages that appear in the .xls property keys
 * (e.g. MDC_P004.de).
 */
export class Languages {
  readonly source: string;
  readonly translations: readonly string[];

  constructor(source = "en", translations: readonly string[] = []) {
    this.source = source;
    this.translations = Array.from(
      new Set(translations.map((t) => String(t))),
    ).filter((t) => t !== this.source);
    Object.freeze(this);
  }

  get all(): readonly string[] {
    return [this.source, ...this.translations];
  }

  includes(lang: string): boolean {
    return this.all.includes(lang);
  }

  get empty(): boolean {
    return !this.source;
  }

  get size(): number {
    return this.all.length;
  }

  toArray(): string[] {
    return [...this.all];
  }

  equals(other: Languages): boolean {
    return (
      this.source === other.source &&
      this.translations.length === other.translations.length &&
      this.translations.every((t, i) => t === other.translations[i])
    );
  }

  /**
   * Scan a properties map for `<property_id>.<lang>` keys and return a
   * Languages object covering every language seen.
   */
  static fromProperties(
    properties: Record<string, unknown> | Map<string, unknown>,
    defaultSource = "en",
  ): Languages {
    const entries =
      properties instanceof Map
        ? Array.from(properties.keys())
        : Object.keys(properties);
    const langs = new Set<string>();
    for (const key of entries) {
      const dot = key.indexOf(".");
      if (dot < 0) continue;
      const lang = key.slice(dot + 1);
      if (/^[a-z]{2}(-[a-z0-9]+)?$/i.test(lang)) {
        langs.add(lang);
      }
    }
    const source = langs.has(defaultSource)
      ? defaultSource
      : ((langs.values().next().value as string | undefined) ?? defaultSource);
    const translations = Array.from(langs).filter((l) => l !== source);
    return new Languages(source, translations);
  }
}
