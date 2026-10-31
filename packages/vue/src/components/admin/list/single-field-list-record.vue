<script lang="ts">
import type { LooseRecord } from "@chelone/core";

/** Props for {@link SingleFieldListRecord}. */
export interface SingleFieldListRecordProps {
  record: LooseRecord;
}
</script>

<script setup lang="ts">
/**
 * Publishes one record of a `<SingleFieldList>` as the ambient record for its
 * slot content. Vue's `provide` is per component, so each record needs its own.
 */

import { toRef } from "vue";
import { provideRecordContext } from "../../../record/record-context";

const props = defineProps<SingleFieldListRecordProps>();
provideRecordContext(toRef(props, "record"));
</script>

<template>
  <slot />
</template>
