import type { Identifier } from "./identifier";

/** Base shape every record satisfies: an object with an `id`. Strict — no `any` index. */
export interface ResourceRecord<TId extends Identifier = Identifier> {
  id: TId;
}

/** Fallback record type when a resource has no registered schema. Extra fields are `unknown`, never `any`. */
export type LooseRecord = ResourceRecord & { [key: string]: unknown };

/** True for a non-null, non-array object: the shape a record has once it reaches a data provider. */
export function isLooseRecord<T extends ResourceRecord>(
  value: T,
): value is T & LooseRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
