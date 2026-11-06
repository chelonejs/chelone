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
