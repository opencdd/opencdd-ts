import { Database } from "./Database";
import { Klass } from "./Klass";

export type ClassTreeField =
  "code" | "name" | "irdi" | "definition" | "class_type";

export const CLASS_TREE_DEFAULT_FIELDS: readonly ClassTreeField[] = [
  "code",
  "name",
];
export const CLASS_TREE_AVAILABLE_FIELDS: readonly ClassTreeField[] = [
  "code",
  "name",
  "irdi",
  "definition",
  "class_type",
];

export interface ClassTreeNode {
  code?: string;
  name?: string;
  irdi?: string;
  definition?: string;
  class_type?: string;
  children?: ClassTreeNode[];
}

export class ClassTree {
  readonly fields: readonly ClassTreeField[];

  constructor(
    readonly database: Database,
    fields: readonly ClassTreeField[] = CLASS_TREE_DEFAULT_FIELDS,
  ) {
    this.fields = fields;
  }

  roots(): Klass[] {
    return this.database.rootClasses();
  }

  each(callback: (klass: Klass, depth: number) => void): void {
    this.walk(this.roots(), 0, callback);
  }

  toObject(
    maxDepth: number | null = null,
    fields: readonly ClassTreeField[] = this.fields,
  ): ClassTreeNode[] {
    return this.roots().map((k) => this.nodeObject(k, 0, maxDepth, fields));
  }

  subtree(
    klass: Klass,
    maxDepth: number | null = null,
    fields: readonly ClassTreeField[] = this.fields,
  ): ClassTreeNode {
    return this.nodeObject(klass, 0, maxDepth, fields);
  }

  private walk(
    nodes: readonly Klass[],
    depth: number,
    callback: (klass: Klass, depth: number) => void,
  ): void {
    for (const node of nodes) {
      callback(node, depth);
      this.walk(node.children, depth + 1, callback);
    }
  }

  private nodeObject(
    klass: Klass,
    depth: number,
    maxDepth: number | null,
    fields: readonly ClassTreeField[],
  ): ClassTreeNode {
    const node: ClassTreeNode = {};
    for (const field of fields) this.mergeField(node, klass, field);
    if (maxDepth === null || depth < maxDepth) {
      const kids = klass.children;
      if (kids.length > 0) {
        node.children = kids.map((c) =>
          this.nodeObject(c, depth + 1, maxDepth, fields),
        );
      }
    }
    return node;
  }

  private mergeField(
    node: ClassTreeNode,
    klass: Klass,
    field: ClassTreeField,
  ): void {
    switch (field) {
      case "code":
        node.code = klass.code;
        return;
      case "name":
        node.name = klass.preferredName("en");
        return;
      case "irdi":
        node.irdi = klass.irdi?.toString();
        return;
      case "definition": {
        const def = klass.definition("en");
        if (def !== undefined && def.length > 0) node.definition = def;
        return;
      }
      case "class_type": {
        const ct = klass.classType;
        if (ct !== undefined) node.class_type = ct.toString();
        return;
      }
      default: {
        const exhaustive: never = field;
        throw new Error(
          `unknown field ${String(exhaustive)}; valid: ${CLASS_TREE_AVAILABLE_FIELDS.join(", ")}`,
        );
      }
    }
  }
}
