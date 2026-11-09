<script
  lang="ts"
  generic="
    RecordType extends ResourceRecord = LooseRecord,
    TResources extends ResourceMap = RegisteredResources,
    TReference extends keyof TResources & string = keyof TResources & string
  "
>
import type {
  LooseRecord,
  RegisteredResources,
  ResourceMap,
  ResourceRecord,
  SourceProp,
} from "@chelone/core";
import type { LinkToType } from "../../../router";

/** Props for {@link ReferenceField}. */
export interface ReferenceFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string
> {
  source: SourceProp<RecordType>;
  /** A registered resource name. */
  reference: TReference;
  record?: RecordType;
  empty?: string;
  /**
   * Where the value links. Omit to infer the referenced record's show page, else
   * its edit page, else no link; `false` renders no link.
   */
  link?: LinkToType;
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
 * `<ReferenceField>` — follows a foreign key to a related record and displays
 * it. The Vue analog of `@chelone/react`'s `fields/reference-field.tsx`. Reads
 * the FK at `source` off the ambient record, fetches the referenced record with
 * `useGetManyAggregate` (vue-query, enabled only when the FK is present), and renders
 * either the default slot (against the referenced record's `RecordContext`) or —
 * with no slot — the reference's record representation.
 *
 * Rebridge note (mirrors the React twin): Chelone carries no
 * `ReferenceFieldBase` stack — this field resolves the single record directly
 * with `useGetManyAggregate` and publishes it via `provideRecordContext`.
 *
 * The content is wrapped in a `<RouterLink>` to the referenced record when
 * `useGetPathForRecord` yields a path. The link stops click propagation so a
 * `<DataTable>` row click does not also fire.
 *
 * The content is wrapped in a `<RouterLink>` to the referenced record when
 * `useGetPathForRecord` yields a path; the link stops click propagation so a
 * `<DataTable>` row click does not also fire.
 */

import { isIdentifier } from "@chelone/core";
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useGetManyAggregate } from "../../../data/queries";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import { provideRecordContext } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";
import { useGetPathForRecord } from "../../../router";

// An explicit `undefined` default keeps Vue from casting an absent `link` to
// `false` (the prop's type includes a boolean), which would disable inference.
const props = withDefaults(defineProps<ReferenceFieldProps<RecordType>>(), {
  link: undefined,
});

const fk = useFieldValue({ source: props.source, record: props.record });
// The FK read: only a string or number counts as an id.
const id = computed(() => (isIdentifier(fk.value) ? fk.value : undefined));

const query = useGetManyAggregate(
  props.reference,
  () => ({ ids: id.value != null ? [id.value] : [] }),
  { enabled: () => id.value != null },
);

const referenceRecord = computed(() => query.data.value?.[0]);

// Publish the referenced record so a default-slot child field reads it.
provideRecordContext(referenceRecord);

const path = useGetPathForRecord({
  resource: () => props.reference,
  record: referenceRecord,
  link: computed(() => props.link),
});

const getRepresentation = useGetRecordRepresentation(props.reference);
const representation = computed(() =>
  referenceRecord.value ? getRepresentation(referenceRecord.value) : null,
);
</script>

<template>
  <template v-if="id == null">
    <span v-if="empty" data-slot="reference-field">{{ empty }}</span>
  </template>
  <template v-else-if="query.isPending.value" />
  <template v-else-if="referenceRecord">
    <RouterLink v-if="path" :to="path" @click.stop>
      <slot>
        <span data-slot="reference-field">{{ representation }}</span>
      </slot>
    </RouterLink>
    <slot v-else>
      <span data-slot="reference-field">{{ representation }}</span>
    </slot>
  </template>
  <template v-else>
    <span v-if="empty" data-slot="reference-field">{{ empty }}</span>
  </template>
</template>
