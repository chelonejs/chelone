<script lang="ts">
import type { ListProps } from "../view/list.vue";

/** Props for {@link ListGuesser}. */
export type ListGuesserProps = ListProps & {
  /** Print the generated code to the console. On outside production. */
  enableLog?: boolean;
};

// Bundler-replaced dev/prod flag (mirrors `buttons/skip-navigation-button.vue`).
// `@chelone/vue` ships no `@types/node`; a minimal ambient declaration keeps it typed.
declare const process: { env?: { NODE_ENV?: string } } | undefined;
</script>

<script setup lang="ts">
/**
 * `<ListGuesser>` — a list page built from the resource's registered Zod
 * schema: a `<List>` around a `<DataTable>` with one column per described
 * field, in schema order. The columns exist before any record loads. A
 * resource with no schema shows `<GuesserEmpty>` and requests nothing.
 */

import type { FieldDescriptor } from "@chelone/core";
import { computed, type Component, watchEffect } from "vue";
import { useResourceContext } from "../../../resource-context";
import DataTable from "../list/data-table.vue";
import DataTableCol from "../list/data-table-col.vue";
import List from "../view/list.vue";
import { guessFieldComponents } from "./guess-components";
import { printGuessedView } from "./guessed-code";
import GuesserEmpty from "./guesser-empty.vue";
import { useGuessedResource } from "./use-guessed-resource";

const props = withDefaults(defineProps<ListGuesserProps>(), {
  enableLog:
    (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) !==
    "production",
});

const resource = props.resource ?? useResourceContext();
if (!resource) {
  throw new Error(
    "<ListGuesser>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}

const descriptor = useGuessedResource(resource);

interface Column {
  field: FieldDescriptor;
  /** Absent for a `text` field, which the column renders itself. */
  component?: Component;
  fieldProps: Record<string, unknown>;
}

const columns = computed<Column[]>(() =>
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

let logged = false;
watchEffect(() => {
  if (logged || !props.enableLog || !descriptor.value) return;
  logged = true;
  console.log(printGuessedView("List", resource, descriptor.value.fields));
});
</script>

<template>
  <GuesserEmpty v-if="!descriptor" :resource="resource" />
  <List v-else :resource="resource" :per-page="perPage" :title="title">
    <DataTable>
      <DataTableCol
        v-for="column in columns"
        :key="column.field.source"
        :source="column.field.source"
        :label="column.field.label"
      >
        <component
          :is="column.component"
          v-if="column.component"
          v-bind="column.fieldProps"
        />
      </DataTableCol>
    </DataTable>
  </List>
</template>
