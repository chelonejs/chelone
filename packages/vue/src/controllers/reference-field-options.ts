/**
 * The options the two reference-field composables share: the record the lookup
 * reads its foreign key from, and the fetch gate. `target` is not here: it is
 * keyed by the referenced record, which only the composables name.
 */

import type { LooseRecord, ResourceRecord, SourceProp } from "@chelone/core";
import type { MaybeRefOrGetter } from "vue";
import type { RecordValue } from "../record/record-context";

export interface ReferenceFieldControllerOptions<
  TName extends string,
  RecordType extends ResourceRecord = LooseRecord,
> {
  /** The resource whose rows point at the record. */
  reference: TName;
  /** The field on the record whose value `target` must equal. The composable defaults it to `"id"`. */
  source?: SourceProp<RecordType>;
  /** Defaults to the ambient record (`RecordContextKey`). */
  record?: MaybeRefOrGetter<RecordValue<RecordType>>;
  /** Gates the data fetch only. Default true. */
  enabled?: boolean;
}
