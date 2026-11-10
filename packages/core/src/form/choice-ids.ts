import type { Identifier } from "../resource/identifier";
import { identifiersOf } from "../resource/identifier";

/**
 * The ids a choice input holds: the field value, or the values of its choices.
 * A member that is not an {@link Identifier} is skipped, and anything that is
 * not an array is no ids.
 */
// type-escape: context: the value a `source` read hands over, which no record type pins
export function toIdentifierList(value: unknown): Identifier[] {
  return identifiersOf(value);
}
