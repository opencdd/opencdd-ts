import { Entity, type EntityJSON } from "./Entity";
import { IRDI } from "./IRDI";
import {
  ENTITY_CONSTRUCTORS,
  type EntityConstructor,
} from "./entityConstructors";

class GenericEntity extends Entity {}

/**
 * Deserializes EntityJSON into the correct concrete subclass based on
 * the metaClassIrdi discriminator. Unknown meta-classes fall back to
 * a generic Entity.
 */
export function entityFromJSON(json: EntityJSON): Entity {
  const ctor: EntityConstructor | undefined =
    ENTITY_CONSTRUCTORS[json.metaClassIrdi ?? ""];
  const entityCtor: EntityConstructor = ctor ?? GenericEntity;
  const irdi = IRDI.parse(json.irdi);
  return new entityCtor(irdi, json.properties, json.metaClassIrdi);
}

export function entityToJSON(entity: Entity): EntityJSON {
  return entity.toJSON();
}
