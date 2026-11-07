<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord } from "@chelone/core";

/** Props for {@link SingleFieldListRecord}. */
export interface SingleFieldListRecordProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  record: TRecord;
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
/**
 * Publishes one record of a `<SingleFieldList>` as the ambient record for its
 * slot content. Vue's `provide` is per component, so each record needs its own.
 */

import { toRef } from "vue";
import { provideRecordContext } from "../../../record/record-context";

const props = defineProps<SingleFieldListRecordProps<TRecord>>();
provideRecordContext(toRef(props, "record"));
</script>

<template>
  <slot />
</template>
