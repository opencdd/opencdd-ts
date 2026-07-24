export { IRDI } from "./IRDI";
export { Entity, type EntityJSON, type Dates } from "./Entity";
export { Klass } from "./Klass";
export { ClassType, type ClassTypeValue } from "./ClassType";
export { RelationType, type RelationTypeValue } from "./RelationType";
export { DatabaseLinker } from "./DatabaseLinker";
export {
  FIELDS,
  fieldFor,
  fieldsForType,
  type FieldSpec,
  type FieldValueKind,
} from "./FieldRegistry";
export { Property, DATA_TYPE_ALIASES } from "./Property";
export { Unit } from "./Unit";
export { ValueList, LIST_TYPE_ALIASES } from "./ValueList";
export { ValueTerm } from "./ValueTerm";
export { Relation } from "./Relation";
export { Visitor } from "./Visitor";
export { ListOfUnit } from "./ListOfUnit";
export { ViewControl } from "./ViewControl";
export {
  DataType,
  SimpleDataType,
  RealMeasureType,
  IntegerMeasureType,
  ClassReference,
  EnumStringType,
  EnumReferenceType,
  type DataTypeKind,
} from "./DataType";
export { entityFromJSON, entityToJSON } from "./factory";
export {
  ENTITY_CONSTRUCTORS,
  entityConstructorFor,
  type EntityConstructor,
} from "./entityConstructors";
export { parseIrdiList, parseStringList, parseIntegerList } from "./helpers";
export {
  Condition,
  ConditionExpression,
  ConditionClassReference,
  ConditionSyntaxError,
  type ConditionOperator,
  type ConditionRhs,
  type ConditionType,
} from "./Condition";
export {
  PropertyDataTypeElement,
  type PropertyDataElementTypeValue,
} from "./PropertyDataTypeElement";
export { ValueFormat, type ValueFormatCode } from "./ValueFormat";
export { AliasTable, AliasTableError } from "./AliasTable";
export { Database, type UnresolvedReference } from "./Database";
export { codePropertyIdFor, CODE_PROPERTY_CANDIDATES } from "./codeProperty";
export {
  REFERENCE_VALUE_KINDS,
  referencePropertyIds,
  setOfRefsPropertyIds,
} from "./referenceKinds";
export { generateGuid, isValidGuid, setGuidOn } from "./Guid";
export {
  EffectiveProperties,
  type EffectivePropertiesResult,
} from "./EffectiveProperties";
export {
  ClassTree,
  type ClassTreeField,
  type ClassTreeNode,
  CLASS_TREE_DEFAULT_FIELDS,
  CLASS_TREE_AVAILABLE_FIELDS,
} from "./ClassTree";
export { RelationTree, type RelationTreeNode } from "./RelationTree";
export {
  CompositionTree,
  type CompositionTreeNode,
  walkComposition,
  compositionDepth,
  compositionSize,
} from "./CompositionTree";
export {
  InstanceRule,
  type InstanceRuleGroup,
  type InstanceRuleException,
  type InstanceRow,
} from "./InstanceRule";
export {
  parseSynonyms,
  serializeSynonyms,
  parseRefSet,
  serializeRefSet,
  parseClassRef,
  serializeClassRef,
  parseDataTypeValue,
  serializeDataTypeValue,
  parseConditionValue,
  serializeConditionValue,
  parseValueFormat,
  serializeValueFormat,
  unwrapAndSplit,
  rejoin,
  type SynonymPair,
} from "./StructuredValues";
export * as MetaClass from "./MetaClass";
export { Languages } from "./Languages";
export {
  VersionHistory,
  type VersionHistoryClassEntry,
} from "./VersionHistory";
export * from "./jsonTypes";
