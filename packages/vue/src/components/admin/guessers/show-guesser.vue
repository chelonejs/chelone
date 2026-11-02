<script lang="ts">
import type { ShowProps } from "../view/show.vue";

/** Props for {@link ShowGuesser}. */
export type ShowGuesserProps = ShowProps & {
  /** Print the generated code to the console. On outside production. */
  enableLog?: boolean;
};

// Bundler-replaced dev/prod flag (mirrors `buttons/skip-navigation-button.vue`).
// `@chelone/vue` ships no `@types/node`; a minimal ambient declaration keeps it typed.
declare const process: { env?: { NODE_ENV?: string } } | undefined;
</script>

<script setup lang="ts">
/**
 * `<ShowGuesser>` — a show page built from the resource's registered Zod
 * schema: a `<Show>` holding one `<RecordField>` per described field, in schema
 * order, the id included. A resource with no schema shows `<GuesserEmpty>` and
 * fetches no record.
 */

import type { FieldDescriptor } from "@chelone/core";
import { computed, type Component, watchEffect } from "vue";
import { useResourceContext } from "../../../resource-context";
import RecordField from "../fields/record-field.vue";
import Show from "../view/show.vue";
import { guessFieldComponents } from "./guess-components";
import { printGuessedView } from "./guessed-code";
import GuesserEmpty from "./guesser-empty.vue";
import { useGuessedResource } from "./use-guessed-resource";

const props = withDefaults(defineProps<ShowGuesserProps>(), {
  enableLog:
    (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) !==
    "production",
});

const resource = props.resource ?? useResourceContext();
if (!resource) {
  throw new Error(
    "<ShowGuesser>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}

const descriptor = useGuessedResource(resource);

interface Row {
  field: FieldDescriptor;
  /** Absent for a `text` field, which `<RecordField>` renders itself. */
  component?: Component;
  fieldProps: Record<string, unknown>;
}

const rows = computed<Row[]>(() =>
  (descriptor.value?.fields ?? []).flatMap((field) => {
    if (field.kind === "unsupported" || field.field === undefined) return [];
    if (field.kind === "text") return [{ field, fieldProps: {} }];
    return [
      {
        field,
        component: guessFieldComponents[field.field],
        fieldProps: {
          source: field.source,
          ...field.fieldProps,
          ...(field.reference !== undefined && { reference: field.reference }),
          ...(field.choices !== undefined && { choices: field.choices }),
        },
      },
    ];
  }),
);

const showProps = computed(() => {
  const { enableLog: _enableLog, ...rest } = props;
  return { ...rest, resource };
});

let logged = false;
watchEffect(() => {
  if (logged || !props.enableLog || !descriptor.value) return;
  logged = true;
  console.log(printGuessedView("Show", resource, descriptor.value.fields));
});
</script>

<template>
  <GuesserEmpty v-if="!descriptor" :resource="resource" />
  <Show v-else v-bind="showProps">
    <template v-for="row in rows" :key="row.field.source">
      <!-- A slot, even a v-if'd-out one, would stop RecordField's TextField fallback. -->
      <RecordField
        v-if="row.component"
        :source="row.field.source"
        :label="row.field.label"
      >
        <component :is="row.component" v-bind="row.fieldProps" />
      </RecordField>
      <RecordField
        v-else
        :source="row.field.source"
        :label="row.field.label"
      />
    </template>
  </Show>
</template>
