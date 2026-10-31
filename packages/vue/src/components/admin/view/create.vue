<script lang="ts">
import type { CreateFormControllerOptions } from "@chelone/core";

/** Props for {@link Create}. */
export interface CreateProps
  extends Pick<
    CreateFormControllerOptions<Record<string, unknown>>,
    "validate" | "schema" | "sanitizeEmptyValues" | "onSuccess"
  > {
  resource?: string;
  record?: Record<string, unknown>;
  title?: string;
  /**
   * Redirect to the list on a successful save (the default). Vue coerces an
   * absent Boolean prop to `false`, so this MUST default via `withDefaults`
   * (otherwise omitting it silently disables the redirect); pass `false` to
   * stay on the form after save.
   */
  redirectOnSave?: boolean;
}
</script>

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
import { computed } from "vue";
import { useCreateController } from "../../../controllers/use-create-controller";
import { useForm } from "../../../form/use-form";
import { useTranslate } from "../../../i18n/use-translate";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import { useRedirectOptional } from "../../../router/nav-composables";
import {
  provideResourceContext,
  useResourceContext,
} from "../../../resource-context";

const props = withDefaults(
  defineProps<CreateProps>(),
  { redirectOnSave: true },
);

const resource = props.resource ?? useResourceContext();
if (!resource) {
  throw new Error(
    "<Create>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}
provideResourceContext(resource);

const create = useCreateController({ resource, record: props.record });
const redirect = useRedirectOptional();
const translate = useTranslate();
const getResourceLabel = useGetResourceLabel();
// Computed so a locale change re-titles the page; `translate` reads the locale.
const defaultTitle = computed(() =>
  translate("ra.page.create", { name: getResourceLabel(resource, 1) }),
);

const form = useForm<Record<string, unknown>>({
  resource,
  record: props.record,
  // The form captures its options once: always hand it this wrapper, so a
  // `validate` set after setup still runs, as of the live prop.
  validate: (values) => props.validate?.(values),
  schema: props.schema,
  sanitizeEmptyValues: props.sanitizeEmptyValues,
  getRecord: () => props.record,
  // Rebaselined to the SERVER record in `onSaved` (as React's composed form
  // does), so `onSuccess` sees the reconciled form.
  resetOnSuccess: false,
  onSubmit: async (data): Promise<FieldErrors | undefined> => {
    const errors = await create.save(data, {
      onSaved: async (saved) => {
        form.reset(saved as Record<string, unknown>);
        await props.onSuccess?.(saved as Record<string, unknown>);
      },
    });
    if (!errors && props.redirectOnSave) {
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
        {{ title ?? defaultTitle }}
      </h2>
      <slot name="actions" />
    </div>
    <div class="my-2">
      <slot />
      <slot name="toolbar" />
    </div>
  </div>
</template>
