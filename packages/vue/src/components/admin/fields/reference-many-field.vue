<script
  lang="ts"
  generic="
    RecordType extends ResourceRecord = LooseRecord,
    TResources extends ResourceMap = RegisteredResources,
    TReference extends keyof TResources & string = keyof TResources & string
  "
>
import type {
  FilterPayload,
  LooseRecord,
  RegisteredResources,
  ReferenceTargetOf,
  ResourceMap,
  ResourceRecord,
  SortPayload,
  SourceProp,
} from "@chelone/core";

/** Props for {@link ReferenceManyField}. */
export interface ReferenceManyFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string
> {
  /** The referenced resource holding the reverse FK (e.g. `"books"`). A registered resource name. */
  reference: TReference;
  /** The FK field on the reference pointing back at this record (e.g. `"author_id"`). A key of the referenced resource's record. */
  target: ReferenceTargetOf<TResources, TReference>;
  /** The field on the current record the `target` matches. Default `"id"`. */
  source?: SourceProp<RecordType>;
  /** The record whose id is matched. Defaults to the ambient record. */
  record?: RecordType;
  /** Initial sort of the related list. Default id ascending. */
  sort?: SortPayload;
  /** Permanent filter merged into the reference lookup. */
  filter?: FilterPayload;
  /** Page size for the related list. Default 25. */
  perPage?: number;
  /** KV namespace for the list params and selection. Default `${reference}.${target}.${id}`; `false` keeps them in memory. */
  storeKey?: string | false;
  /** Debounce delay in ms for debounced `setFilters` calls. Default 500. */
  debounce?: number;
}
</script>

<script
  setup
  lang="ts"
  generic="
    RecordType extends ResourceRecord = LooseRecord,
    TResources extends ResourceMap = RegisteredResources,
    TReference extends keyof TResources & string = keyof TResources & string
  "
>
/**
 * `<ReferenceManyField>` — displays multiple related records that reference the
 * current record via a foreign key (a one-to-many / reverse relationship). The
 * Vue port of `@chelone/react`'s `fields/reference-many-field.tsx`. Asks the
 * data provider's `getManyReference` for the records of `reference` whose
 * `target` equals the current record's id (or `source`), one page at a time:
 * `ListPagination`, a `DataTable` header click and `setFilters` in the list
 * context all reach the server. The result goes in a `ListContext`, the
 * reference resource is published, and the default slot renders. The list does
 * not read or write the URL.
 *
 * Rebridge note (mirrors the React twin): this is
 * `useReferenceManyFieldController` plus `provideListContext`, where ra-core
 * splits it into `ReferenceManyFieldBase`.
 */

import { useReferenceManyFieldController } from "../../../controllers/use-reference-many-field-controller";
import { provideListContext } from "../../../list/list-context";
import { provideResourceContext } from "../../../resource-context";

// `storeKey` may be `false`, which makes Vue cast an absent prop to `false`
// (keep in memory). The explicit `undefined` default keeps absent as absent.
const props = withDefaults(
  defineProps<ReferenceManyFieldProps<RecordType, TResources, TReference>>(),
  {
    storeKey: undefined,
  },
);

// A getter, so a `record` prop or an async ambient record lands live. The
// composable falls back to the ambient record when the prop is absent.
// The composable is called at its loose binding: `reference` and `target` are
// already checked against `TResources` by these props, and `sort`/`filter` stay
// the loose payloads they are today.
const listContext = useReferenceManyFieldController<
  ResourceMap,
  TReference,
  RecordType
>({
  reference: props.reference,
  target: props.target,
  source: props.source,
  record: () => props.record,
  sort: props.sort,
  filter: props.filter,
  perPage: props.perPage,
  storeKey: props.storeKey,
  debounce: props.debounce,
});

provideResourceContext(props.reference);
provideListContext(listContext);
</script>

<template>
  <slot />
</template>
