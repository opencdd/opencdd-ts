import { Entity } from "./Entity";
import { IRDI } from "./IRDI";
import * as Pids from "./PropertyIds.generated";
import { parseIrdiList } from "./helpers";
import { RelationType } from "./RelationType";

/**
 * A CDD Relation entity (IEC 61360 meta-class MDC_C011).
 * Ported from Opencdd::Relation (lib/opencdd/relation.rb).
 */
export class Relation extends Entity {
  get relationType(): RelationType | undefined {
    return RelationType.parse(this.getString(Pids.MDC_P200)) ?? undefined;
  }

  get isPredication(): boolean {
    return this.relationType?.predication ?? false;
  }

  get isFunction(): boolean {
    return this.relationType?.function ?? false;
  }

  get domainIrdis(): IRDI[] {
    return [
      ...parseIrdiList(this.get(Pids.MDC_P201)),
      ...parseIrdiList(this.get(Pids.MDC_P202)),
    ];
  }

  get domainOfFunctionIrdis(): IRDI[] {
    return parseIrdiList(this.get(Pids.MDC_P202));
  }

  get codomainIrdi(): IRDI | null {
    const raw = this.getString(Pids.MDC_P203);
    return raw ? IRDI.parse(raw) : null;
  }

  get formula(): string | undefined {
    return this.getString(Pids.MDC_P204);
  }

  get formulaLanguage(): string | undefined {
    return this.getString(Pids.MDC_P205);
  }

  get externalSolver(): string | undefined {
    return this.getString(Pids.MDC_P206);
  }

  get triggerEvent(): string | undefined {
    return this.getString(Pids.MDC_P207);
  }

  get domainElementType(): string | undefined {
    return this.getString(Pids.MDC_P208);
  }

  get codomainElementType(): string | undefined {
    return this.getString(Pids.MDC_P209);
  }

  get role(): string | undefined {
    return this.getString(Pids.MDC_P210);
  }

  get segment(): string | undefined {
    return this.getString(Pids.MDC_P211);
  }

  get superRelationIrdi(): IRDI | null {
    const raw = this.getString(Pids.MDC_P212);
    return raw ? IRDI.parse(raw) : null;
  }
}
