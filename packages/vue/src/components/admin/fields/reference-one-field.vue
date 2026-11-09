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

/** Props for {@link ReferenceOneField}. */
export interface ReferenceOneFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string
> {
  /** The referenced resource holding the one-to-one record (e.g. `"bios"`). A registered resource name. */
  reference: TReference;
  /** The FK field on the reference pointing back at this record (e.g. `"author_id"`). A key of the referenced resource's record. */
  target: ReferenceTargetOf<TResources, TReference>;
  /** The field on the current record the `target` matches. Default `"id"`. */
  source?: SourceProp<RecordType>;
  /** The record whose id is matched. Defaults to the ambient record. */
  record?: RecordType;
  /** Sort applied to the reference lookup (the first match is used). Read when the record id changes; remount with a `key` to change it otherwise. */
  sort?: SortPayload;
  /** Permanent filter merged into the reference lookup. Read when the record id changes; remount with a `key` to change it otherwise. */
  filter?: FilterPayload;
  /** Rendered when no related record exists. A string is translated. */
  empty?: string;
  /** Rendered while the referenced record is loading. */
  loading?: string;
  /** Rendered when the reference lookup errors. */
  error?: string;
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
 * `<ReferenceOneField>` — displays a related record from a one-to-one
 * relationship. The Vue port of `@chelone/react`'s `fields/reference-one-field.tsx`.
 * Fetches the record of `reference` whose `target` matches the current record's id
 * (or `source`), then renders the default slot inside a `RecordContext` populated
 * with the referenced record — or, with no slot content, its record representation.
 *
 * The default slot is SCOPED (`#default="{ record }"`) — the Vue analog of the
 * React twin's `render` prop — AND publishes the referenced record on the
 * `RecordContext`, so a child field (`<TextField source="body" />`) reads it
 * ambiently too. Distinct `empty` / `loading` / `error` states mirror the twin.
 *
 * Rebridge note: chelone has no `ReferenceOneFieldBase`; the lookup is
 * `useReferenceOneFieldController`, which reads the first match through
 * `getManyReference` as a page of one. `sort` and `filter` are read when the
 * record id changes, not on every prop change.
 */

import { computed, ref, watch } from "vue";
import { useReferenceOneFieldController } from "../../../controllers";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import type { RecordValue } from "../../../record/record-context";
import { provideRecordContext } from "../../../record/record-context";
import { provideResourceContext } from "../../../resource-context";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<
  ReferenceOneFieldProps<RecordType, TResources, TReference>
>();

const translate = useTranslate();
const getRepresentation = useGetRecordRepresentation(props.reference);

// The composable is called at its loose binding: `reference` and `target` are
// already checked against `TResources` by these props, and `sort`/`filter` stay
// the loose payloads they are today.
const query = useReferenceOneFieldController<
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
});

const referenceRecord = computed(() => query.referenceRecord);

// Publish the referenced record so a default-slot child field reads it ambiently.
const recordRef = ref<RecordValue>(referenceRecord.value);
watch(referenceRecord, (next) => {
  recordRef.value = next;
});
provideRecordContext(recordRef);
provideResourceContext(props.reference);

const isError = computed(() => !referenceRecord.value && query.error != null);

const representation = computed(() =>
  referenceRecord.value ? getRepresentation(referenceRecord.value) : null,
);

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);
</script>

<template>
  <template v-if="query.isPending">
    <span v-if="props.loading" data-slot="reference-one-field">{{
      props.loading
    }}</span>
  </template>
  <template v-else-if="isError">
    <span v-if="props.error" data-slot="reference-one-field">{{
      props.error
    }}</span>
  </template>
  <template v-else-if="referenceRecord">
    <slot :record="referenceRecord">
      <span data-slot="reference-one-field">{{ representation }}</span>
    </slot>
  </template>
  <template v-else>
    <span v-if="emptyText != null" data-slot="reference-one-field">{{
      emptyText
    }}</span>
  </template>
</template>
