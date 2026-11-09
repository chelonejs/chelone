export type Identifier = string | number;

/**
 * True for the value a record id or foreign key holds: a `string` or a `number`.
 * The check for a value read out of a record at a `source`, where the record's
 * own type does not pin the field.
 */
export function isIdentifier(value: unknown): value is Identifier {
  return typeof value === "string" || typeof value === "number";
}

/**
 * True for an array whose every member is an {@link Identifier}: the shape a
 * to-many foreign key holds on a record.
 */
export function isIdentifierArray(value: unknown): value is Identifier[] {
  return Array.isArray(value) && value.every(isIdentifier);
}

/**
 * The ids a to-many foreign key holds. An array that is all ids is returned as
 * it is; one with a member that is not an id keeps its id members, because a
 * nullable `int[]` reads as nulls between real ids and dropping the whole array
 * would hide records the record has. Anything that is not an array is no ids.
 */
// type-escape: context: the value a `source` read hands over, which no record type pins
export function identifiersOf(value: unknown): Identifier[] {
  if (isIdentifierArray(value)) return value;
  return Array.isArray(value) ? value.filter(isIdentifier) : [];
}
