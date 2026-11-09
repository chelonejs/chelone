<script setup lang="ts">
/**
 * One call in `<DataProviderDevtools>`: method, resource, duration, the error
 * of a failed call, and its params and result as indented JSON under a
 * disclosure.
 */

import {
  DEVTOOLS_MAX_VALUE_LENGTH,
  type DataProviderLogEntry,
} from "@chelone/core";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<{ entry: DataProviderLogEntry }>();

const translate = useTranslate();

/** The value as indented JSON cut to `DEVTOOLS_MAX_VALUE_LENGTH`, or `undefined` when there is none to show. */
// type-escape: server: params and results are whatever the provider's methods take and give
function show(value: unknown): string | undefined {
  try {
    return JSON.stringify(value, null, 2)?.slice(0, DEVTOOLS_MAX_VALUE_LENGTH);
  } catch {
    return "[unserializable]";
  }
}
</script>

<template>
  <li
    data-slot="data-provider-devtools-entry"
    :data-status="props.entry.status"
    class="border-b px-3 py-1.5 last:border-b-0 data-[status=error]:text-destructive"
  >
    <div class="flex items-baseline gap-2">
      <span class="font-semibold">{{ props.entry.method }}</span>
      <span class="truncate">{{ props.entry.resource }}</span>
      <span class="ml-auto shrink-0 tabular-nums text-muted-foreground">
        {{ props.entry.durationMs.toFixed(1) }}ms
      </span>
    </div>
    <p v-if="props.entry.error !== undefined" class="break-all">
      {{ props.entry.error }}
    </p>
    <details>
      <summary class="cursor-pointer text-muted-foreground">
        {{ translate("chelone.devtools.details", { _: "Details" }) }}
      </summary>
      <div v-if="show(props.entry.params) !== undefined">
        <div class="text-muted-foreground">
          {{ translate("chelone.devtools.params", { _: "Params" }) }}
        </div>
        <pre
          class="max-h-48 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap break-all"
          >{{ show(props.entry.params) }}</pre
        >
      </div>
      <div v-if="show(props.entry.result) !== undefined">
        <div class="text-muted-foreground">
          {{ translate("chelone.devtools.result", { _: "Result" }) }}
        </div>
        <pre
          class="max-h-48 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap break-all"
          >{{ show(props.entry.result) }}</pre
        >
      </div>
    </details>
  </li>
</template>
