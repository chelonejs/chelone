<script lang="ts">
import type { EditProps } from "../view/edit.vue";

/** Props for {@link EditGuesser}. */
export type EditGuesserProps = EditProps & {
  /** Print the generated code to the console. On outside production. */
  enableLog?: boolean;
};

// Bundler-replaced dev/prod flag (mirrors `buttons/skip-navigation-button.vue`).
// `@chelone/vue` ships no `@types/node`; a minimal ambient declaration keeps it typed.
declare const process: { env?: { NODE_ENV?: string } } | undefined;
</script>

<script setup lang="ts">
/**
 * `<EditGuesser>` — an edit page built from the resource's registered Zod
 * schema: an `<Edit>` holding one input per described field, in schema order,
 * then the default `<Toolbar>`. `<Edit>` already validates against the same
 * registry schema, so there is no `validate` to pass. A resource with no schema
 * shows `<GuesserEmpty>` and fetches no record.
 */

import type { FieldDescriptor } from "@chelone/core";
import { computed, type Component, watchEffect } from "vue";
import { useResourceContext } from "../../../resource-context";
import Toolbar from "../buttons/toolbar.vue";
import AutocompleteArrayInput from "../inputs/autocomplete-array-input.vue";
import Edit from "../view/edit.vue";
import { guessInputComponents } from "./guess-components";
import { printGuessedView } from "./guessed-code";
import GuesserEmpty from "./guesser-empty.vue";
import { useGuessedResource } from "./use-guessed-resource";

const props = withDefaults(defineProps<EditGuesserProps>(), {
  enableLog:
    (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) !==
    "production",
  // Vue casts an absent Boolean prop to `false`; `<Edit>` redirects by default.
  redirectOnSave: true,
});

const resource = props.resource ?? useResourceContext();
if (!resource) {
  throw new Error(
    "<EditGuesser>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}

const descriptor = useGuessedResource(resource);

interface Input {
  field: FieldDescriptor;
  component: Component;
  inputProps: Record<string, unknown>;
  /** A `ReferenceArrayInput` declares no `label`; its child input shows it. */
  childLabel?: string;
}

const inputs = computed<Input[]>(() =>
  (descriptor.value?.fields ?? []).flatMap((field) => {
    if (field.primary || field.kind === "unsupported" || !field.input) return [];
    const wrapsChild = field.input === "ReferenceArrayInput";
    return [
      {
        field,
        component: guessInputComponents[field.input],
        childLabel: wrapsChild ? field.label : undefined,
        inputProps: {
          source: field.source,
          ...(field.label !== undefined && !wrapsChild && { label: field.label }),
          ...(field.reference !== undefined && { reference: field.reference }),
          ...(field.choices !== undefined && { choices: field.choices }),
        },
      },
    ];
  }),
);

const editProps = computed(() => {
  const { enableLog: _enableLog, ...rest } = props;
  return { ...rest, resource };
});

let logged = false;
watchEffect(() => {
  if (logged || !props.enableLog || !descriptor.value) return;
  logged = true;
  console.log(printGuessedView("Edit", resource, descriptor.value.fields));
});
</script>

<template>
  <GuesserEmpty v-if="!descriptor" :resource="resource" />
  <Edit v-else v-bind="editProps">
    <component
      :is="input.component"
      v-for="input in inputs"
      :key="input.field.source"
      v-bind="input.inputProps"
    >
      <AutocompleteArrayInput
        v-if="input.childLabel !== undefined"
        :label="input.childLabel"
      />
    </component>
    <Toolbar />
  </Edit>
</template>
