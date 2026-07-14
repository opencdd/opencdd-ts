import { Database } from "./Database";
import { Relation } from "./Relation";
import { IRDI } from "./IRDI";
import * as Pids from "./PropertyIds.generated";

export interface RelationTreeNode {
  readonly relation: Relation;
  readonly children: readonly RelationTreeNode[];
}

export class RelationTree {
  private indexCache: Map<string, Relation[]> | null = null;

  constructor(readonly database: Database) {}

  for(
    root: Relation | IRDI | string | null = null,
    maxDepth = 10,
  ): RelationTreeNode[] {
    const roots =
      root === null
        ? this.rootRelations()
        : [this.lookupRelation(root)].filter((r): r is Relation => r !== null);
    return roots
      .map((r) => this.buildNode(r, new Set<string>(), maxDepth))
      .filter((n): n is RelationTreeNode => n !== null);
  }

  private buildNode(
    relation: Relation,
    path: Set<string>,
    maxDepth: number,
  ): RelationTreeNode | null {
    if (maxDepth <= 0) return null;
    const key = relation.irdi?.toString();
    if (key !== undefined && path.has(key)) return null;

    const childPath = new Set(path);
    if (key !== undefined) childPath.add(key);
    const children = this.childrenOf(relation)
      .map((c) => this.buildNode(c, childPath, maxDepth - 1))
      .filter((n): n is RelationTreeNode => n !== null);
    return { relation, children };
  }

  private childrenOf(relation: Relation): Relation[] {
    const key = relation.irdi?.toString();
    if (key === undefined) return [];
    return [...(this.index().get(key) ?? [])];
  }

  private rootRelations(): Relation[] {
    return this.database
      .relations()
      .filter((r) => r.superRelationIrdi === null);
  }

  private lookupRelation(ref: Relation | IRDI | string): Relation | null {
    if (ref instanceof Relation) return ref;
    const entity = this.database.resolveReference(
      ref instanceof IRDI ? ref.toString() : ref,
    );
    return entity instanceof Relation ? entity : null;
  }

  private index(): Map<string, Relation[]> {
    if (this.indexCache !== null) return this.indexCache;
    const map = new Map<string, Relation[]>();
    for (const relation of this.database.relations()) {
      const raw = relation.properties.get(Pids.MDC_P212);
      if (raw === undefined) continue;
      const s = String(raw).trim();
      if (s.length === 0) continue;
      const parent = this.database.resolveReference(s);
      if (parent === null || parent.irdi === null) continue;
      const key = parent.irdi.toString();
      const list = map.get(key) ?? [];
      if (!list.includes(relation)) list.push(relation);
      map.set(key, list);
    }
    this.indexCache = map;
    return map;
  }
}
