<script lang="ts">
import type {
  CreateFormControllerOptions,
  LooseRecord,
} from "@chelone/core";

/** Props for {@link Create}. */
export interface CreateProps<TRecord = LooseRecord>
  extends Pick<
    CreateFormControllerOptions<TRecord>,
    "validate" | "schema" | "sanitizeEmptyValues" | "onSuccess"
  > {
  resource?: string;
  record?: Partial<TRecord>;
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

<script setup lang="ts" generic="TRecord = LooseRecord">
/**
 * `<Create>` — a create page, the Vue analog of `@chelone/react`'s
 * `views/create.tsx`. Composes `useCreateController` (Task 5 — owns the create
 * `save`, nothing to fetch) with `useForm` (Task 6 — the form the inputs bind
 * to), seeded by an optional `record` prop. `useForm.onSubmit` runs the
 * controller's `save`; on success it redirects to the list (a no-op without a
 * router). The ambient form is provided by `useForm`, so bare inputs / a
 * `<SaveButton>` child work directly.
 */

import {
  type FieldErrors,
  getRecordFromLocation,
  type RecordResources,
} from "@chelone/core";
import { computed } from "vue";
import { useCreateController } from "../../../controllers/use-create-controller";
import { useForm } from "../../../form/use-form";
import { useTranslate } from "../../../i18n/use-translate";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import { useRouterAdapterOptional } from "../../../router/adapter";
import { useRedirectOptional } from "../../../router/nav-composables";
import {
  provideResourceContext,
  useResourceContext,
} from "../../../resource-context";

const props = withDefaults(
  defineProps<CreateProps<TRecord>>(),
  { redirectOnSave: true },
);

const resource = props.resource ?? useResourceContext();
if (!resource) {
  throw new Error(
    "<Create>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}
provideResourceContext(resource);

// The location's `?source=` JSON (what `<CloneButton>` writes) seeds the form,
// read once at setup like `record`. Its keys win over `record`. Skipped without
// a router adapter.
const adapter = useRouterAdapterOptional();
const recordFromLocation = adapter
  ? getRecordFromLocation(adapter.useLocation().value)
  : null;
// type-escape: json: the location's `?source=` is untyped, and the form seeds from it as it does from `record`
const seed = { ...props.record, ...recordFromLocation } as Partial<TRecord>;

const create = useCreateController<RecordResources<TRecord>, string>({
  resource,
  record: seed,
});
const redirect = useRedirectOptional();
const translate = useTranslate();
const getResourceLabel = useGetResourceLabel();
// Computed so a locale change re-titles the page; `translate` reads the locale.
const defaultTitle = computed(() =>
  translate("chelone.page.create", { name: getResourceLabel(resource, 1) }),
);

const form = useForm<Partial<TRecord>>({
  resource,
  record: seed,
  // The form captures its options once: always hand it this wrapper, so a
  // `validate` set after setup still runs, as of the live prop.
  validate: (values) => props.validate?.(values),
  schema: props.schema,
  sanitizeEmptyValues: props.sanitizeEmptyValues,
  getRecord: () => seed,
  // Rebaselined to the SERVER record in `onSaved` (as React's composed form
  // does), so `onSuccess` sees the reconciled form.
  resetOnSuccess: false,
  onSubmit: async (data): Promise<FieldErrors | undefined> => {
    const errors = await create.save(data, {
      onSaved: async (saved) => {
        form.reset(saved);
        await props.onSuccess?.(saved);
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
    <div class="my-2 space-y-4">
      <slot />
      <slot name="toolbar" />
    </div>
  </div>
</template>
