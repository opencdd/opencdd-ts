import { Database } from "./Database";
import { Klass } from "./Klass";
import { Property } from "./Property";
import { Entity } from "./Entity";
import { ClassReference } from "./DataType";
import { EffectiveProperties } from "./EffectiveProperties";

export interface CompositionTreeNode {
  readonly entity: Entity;
  readonly children: readonly CompositionTreeNode[];
}

export class CompositionTree {
  private readonly effectiveProperties: EffectiveProperties;

  constructor(readonly database: Database) {
    this.effectiveProperties = new EffectiveProperties(database);
  }

  for(klass: Klass, maxDepth = 10): CompositionTreeNode {
    return this.buildClassNode(klass, new Set<string>(), 0, maxDepth);
  }

  private buildClassNode(
    value: Klass,
    path: Set<string>,
    depth: number,
    maxDepth: number,
  ): CompositionTreeNode {
    if (value.irdi === null) {
      return { entity: value, children: [] };
    }
    const key = value.irdi.toString();
    const children =
      path.has(key) || depth >= maxDepth
        ? []
        : this.buildPropertyChildren(
            value,
            this.withPath(path, key),
            depth + 1,
            maxDepth,
          );
    return { entity: value, children };
  }

  private buildPropertyChildren(
    klass: Klass,
    path: Set<string>,
    depth: number,
    maxDepth: number,
  ): CompositionTreeNode[] {
    const result = this.effectiveProperties.for(klass);
    return result.properties.map((prop) =>
      this.buildPropertyNode(prop, path, depth, maxDepth),
    );
  }

  private buildPropertyNode(
    prop: Property,
    path: Set<string>,
    depth: number,
    maxDepth: number,
  ): CompositionTreeNode {
    const sub: CompositionTreeNode[] = [];
    if (depth < maxDepth) {
      for (const target of this.classReferenceTargets(prop)) {
        const node = this.buildClassNode(target, path, depth, maxDepth);
        sub.push(node);
      }
      for (const target of this.definitionClassSubclasses(prop)) {
        const node = this.buildClassNode(target, path, depth, maxDepth);
        sub.push(node);
      }
    }
    return { entity: prop, children: sub };
  }

  private classReferenceTargets(prop: Property): Klass[] {
    const dt = prop.dataTypeParsed;
    if (!(dt instanceof ClassReference)) return [];
    const target = this.database.resolveReference(dt.classIdentifier);
    return target instanceof Klass ? [target] : [];
  }

  private definitionClassSubclasses(prop: Property): Klass[] {
    const dcIrdi = prop.definitionClassIrdi;
    if (dcIrdi === null) return [];
    const definitionClass = this.database.find(dcIrdi);
    if (!(definitionClass instanceof Klass)) return [];
    if (!definitionClass.categorical) return [];
    return definitionClass.children.filter(
      (c): c is Klass => c instanceof Klass,
    );
  }

  private withPath(path: Set<string>, key: string): Set<string> {
    const next = new Set(path);
    next.add(key);
    return next;
  }
}

export function walkComposition(
  node: CompositionTreeNode,
  callback: (n: CompositionTreeNode) => void,
): void {
  callback(node);
  for (const child of node.children) walkComposition(child, callback);
}

export function compositionDepth(node: CompositionTreeNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(compositionDepth));
}

export function compositionSize(node: CompositionTreeNode): number {
  let count = 0;
  walkComposition(node, () => {
    count++;
  });
  return count;
}
