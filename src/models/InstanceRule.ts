import { Klass } from "./Klass";

export interface InstanceRuleGroup {
  readonly name: string;
  readonly valuesByProperty: Readonly<Record<string, readonly unknown[]>>;
}

export interface InstanceRuleException {
  readonly groupName: string;
  readonly lineId: string;
}

export type InstanceRow = Record<string, unknown>;

const LINE_ID_KEY = "__line_id__";
const GROUP_NAME_KEY = "__group_name__";

export class InstanceRule {
  constructor(
    readonly klass: Klass,
    readonly groups: readonly InstanceRuleGroup[],
    readonly exceptions: readonly InstanceRuleException[] = [],
  ) {}

  expand(): InstanceRow[] {
    if (this.groups.length === 0) return [];
    const perGroup = this.groups.map((g) => this.expandGroup(g));
    if (perGroup.some((rows) => rows.length === 0)) return [];

    const product = perGroup.reduce((acc, rows) => {
      const out: InstanceRow[] = [];
      for (const a of acc) {
        for (const b of rows) out.push({ ...a, ...b });
      }
      return out;
    });

    return product
      .filter((row) => !this.isException(row))
      .map((row) => this.stripInternal(row));
  }

  private expandGroup(group: InstanceRuleGroup): InstanceRow[] {
    const values = group.valuesByProperty;
    const propertyIds = Object.keys(values);
    if (propertyIds.length === 0) return [];
    const length = propertyIds.reduce(
      (max, pid) => Math.max(max, values[pid].length),
      0,
    );
    const rows: InstanceRow[] = [];
    for (let i = 0; i < length; i++) {
      const row: InstanceRow = {};
      for (const pid of propertyIds) {
        const v = values[pid][i];
        if (v !== undefined) row[pid] = v;
      }
      row[LINE_ID_KEY] = `LINE${i + 1}`;
      row[GROUP_NAME_KEY] = group.name;
      rows.push(row);
    }
    return rows;
  }

  private isException(row: InstanceRow): boolean {
    if (this.exceptions.length === 0) return false;
    const groupName = String(row[GROUP_NAME_KEY] ?? "");
    const lineId = String(row[LINE_ID_KEY] ?? "");
    return this.exceptions.some(
      (ex) => ex.groupName === groupName && ex.lineId === lineId,
    );
  }

  private stripInternal(row: InstanceRow): InstanceRow {
    const out: InstanceRow = { ...row };
    delete out[LINE_ID_KEY];
    delete out[GROUP_NAME_KEY];
    return out;
  }
}
