<script setup lang="ts">
/**
 * `<Create>` — a create page, the Vue analog of `@chelone/react`'s
 * `views/create.tsx`. Composes `useCreateController` (Task 5 — owns the create
 * `save`, nothing to fetch) with `useForm` (Task 6 — the form the inputs bind
 * to), seeded by an optional `record` prop. `useForm.onSubmit` runs the
 * controller's `save`; on success it redirects to the list (a no-op without a
 * router). The ambient form is provided by `useForm`, so bare inputs / a
 * `<SaveButton>` child work directly.
 */

import type { FieldErrors } from "@chelone/core";
import { useCreateController } from "../../../controllers/use-create-controller";
import { useForm } from "../../../form/use-form";
import { useRedirectOptional } from "../../../router/nav-composables";
import {
  provideResourceContext,
  useResourceContext,
} from "../../../resource-context";

const props = defineProps<{
  resource?: string;
  record?: Record<string, unknown>;
  title?: string;
  redirectOnSave?: boolean;
}>();

const resource = props.resource ?? useResourceContext();
if (!resource) {
  throw new Error(
    "<Create>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}
provideResourceContext(resource);

const create = useCreateController({ resource, record: props.record });
const redirect = useRedirectOptional();

useForm<Record<string, unknown>>({
  resource,
  record: props.record,
  onSubmit: async (data): Promise<FieldErrors | undefined> => {
    const errors = await create.save(data);
    if (!errors && props.redirectOnSave !== false) {
      redirect("list", resource);
    }
    return errors;
  },
});
</script>

<template>
  <div data-slot="create">
    <div class="flex justify-between items-start flex-wrap gap-2 my-2">
      <h2 v-if="title !== ''" class="text-2xl font-bold tracking-tight">
        {{ title ?? resource }}
      </h2>
      <slot name="actions" />
    </div>
    <div class="my-2">
      <slot />
      <slot name="toolbar" />
    </div>
  </div>
</template>
