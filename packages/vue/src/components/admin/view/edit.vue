<script setup lang="ts">
/**
 * `<Edit>` — an edit page, the Vue analog of `@chelone/react`'s `views/edit.tsx`.
 * Composes the two V1 seams the React `useEditForm` fuses: `useEditController`
 * (Task 5 — fetches the record + owns `save`) and `useForm` (Task 6 — the
 * form-core bridge that `useInput` children bind to). The record hydrates
 * asynchronously, so a `watch` rebaselines the form (`form.reset`) when it lands.
 *
 * `useForm.onSubmit` runs the controller's `save`; on success (no field errors)
 * it redirects to the list (a no-op without a router — unit tests). The ambient
 * form is provided by `useForm` itself, so a bare `<SaveButton>` / `<TextInput>`
 * child works with no `<SimpleForm>` in between.
 */

import type { FieldErrors, Identifier } from "@chelone/core";
import { computed, watch } from "vue";
import { useEditController } from "../../../controllers/use-edit-controller";
import { useForm } from "../../../form/use-form";
import { provideRecordContext } from "../../../record/record-context";
import { useRedirectOptional } from "../../../router/nav-composables";
import {
  provideResourceContext,
  useResourceContext,
} from "../../../resource-context";

const props = withDefaults(
  defineProps<{
    resource?: string;
    id?: Identifier;
    title?: string;
    /**
     * Redirect to the list on a successful save (the default). Vue coerces an
     * absent Boolean prop to `false`, so this MUST default via `withDefaults`
     * (otherwise omitting it silently disables the redirect); pass `false` to
     * stay on the form after save.
     */
    redirectOnSave?: boolean;
  }>(),
  { redirectOnSave: true },
);

const resource = props.resource ?? useResourceContext();
if (!resource) {
  throw new Error(
    "<Edit>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}
provideResourceContext(resource);

const edit = useEditController({ resource, id: props.id });
const redirect = useRedirectOptional();

const form = useForm<Record<string, unknown>>({
  resource,
  record: edit.record as Record<string, unknown> | undefined,
  onSubmit: async (data): Promise<FieldErrors | undefined> => {
    const errors = await edit.save(data);
    if (!errors && props.redirectOnSave) {
      redirect("list", resource);
    }
    return errors;
  },
});

// Publish the record for slotted fields; rebaseline the form when it hydrates.
provideRecordContext(
  computed(() => edit.record as Record<string, unknown> | undefined),
);
watch(
  () => edit.record,
  (record) => {
    if (record) form.reset(record as Record<string, unknown>);
  },
);
</script>

<template>
  <div data-slot="edit">
    <div class="flex justify-between items-start flex-wrap gap-2 my-2">
      <h2 v-if="title !== ''" class="text-2xl font-bold tracking-tight">
        {{ title ?? resource }}
      </h2>
      <slot name="actions" />
    </div>
    <div v-if="edit.record" class="my-2">
      <slot />
      <slot name="toolbar" />
    </div>
  </div>
</template>
