import type { Identifier } from "./identifier";

/** Base shape every record satisfies: an object with an `id`. Strict — no `any` index. */
export interface ResourceRecord<TId extends Identifier = Identifier> {
  id: TId;
}

/** Fallback record type when a resource has no registered schema. Extra fields are `unknown`, never `any`. */
export type LooseRecord = ResourceRecord & { [key: string]: unknown };
