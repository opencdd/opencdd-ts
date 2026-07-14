import { Entity } from "./Entity";
import { IRDI } from "./IRDI";
import { Klass } from "./Klass";
import { Property } from "./Property";
import { Unit } from "./Unit";
import { ValueList } from "./ValueList";
import { ValueTerm } from "./ValueTerm";
import { Relation } from "./Relation";
import { ViewControl } from "./ViewControl";
import {
  MDC_C002,
  MDC_C003,
  MDC_C005,
  MDC_C009,
  MDC_C010,
  MDC_C011,
  EXT_C001,
} from "./MetaClasses.generated";

export type EntityConstructor = new (
  irdi: IRDI | null,
  properties: Record<string, unknown>,
  metaClassIrdi: string | null,
) => Entity;

export const ENTITY_CONSTRUCTORS: Readonly<Record<string, EntityConstructor>> =
  {
    [MDC_C002]: Klass,
    [MDC_C003]: Property,
    [MDC_C005]: ValueList,
    [MDC_C009]: Unit,
    [MDC_C010]: ValueTerm,
    [MDC_C011]: Relation,
    [EXT_C001]: ViewControl,
  };

export function entityConstructorFor(
  metaClassIrdi: string | null | undefined,
): EntityConstructor | undefined {
  if (!metaClassIrdi) return undefined;
  return ENTITY_CONSTRUCTORS[metaClassIrdi];
}
