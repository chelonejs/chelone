<script lang="ts">
/** Props for {@link Show}. */
export interface ShowProps {
  resource?: string;
  id?: Identifier;
  title?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Show>` — a read-only detail page, the Vue analog of `@chelone/react`'s
 * `views/show.tsx`. Mirrors the `<Edit>`/`<Create>` structure minus the form:
 * runs `useShowController` (Task-1 — fetches the record, no `save`), publishes
 * the record into `RecordContext` so slotted display fields resolve it, and
 * renders a title + actions slot + the default slot (the fields). The record
 * hydrates asynchronously, so — like `<Edit>` — the body only renders once the
 * record has landed (a bare field would otherwise flash its empty state).
 *
 * Resource + id resolution mirror `<Edit>`: the `resource` prop wins over the
 * ambient `<Resource>` name; the `id` prop wins over the ambient `:id` route
 * param (resolved inside the controller). Show never mutates, so there is no
 * form provider / redirect wiring.
 */

import type { Identifier } from "@chelone/core";
import { computed } from "vue";
import { useShowController } from "../../../controllers/use-show-controller";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import { provideRecordContext } from "../../../record/record-context";
import {
  provideResourceContext,
  useResourceContext,
} from "../../../resource-context";

const props = defineProps<ShowProps>();

const resource = props.resource ?? useResourceContext();
if (!resource) {
  throw new Error(
    "<Show>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}
provideResourceContext(resource);

const show = useShowController({ resource, id: props.id });
const getRecordRepresentation = useGetRecordRepresentation(resource);
// Empty until the record loads; computed so the heading follows the hydration.
const defaultTitle = computed(() => getRecordRepresentation(show.record));

// Publish the record for slotted display fields (reactive — hydrates async).
provideRecordContext(
  computed(() => show.record as Record<string, unknown> | undefined),
);
</script>

<template>
  <div data-slot="show">
    <div class="flex justify-between items-start flex-wrap gap-2 my-2">
      <h2 v-if="title !== ''" class="text-2xl font-bold tracking-tight">
        {{ title ?? defaultTitle }}
      </h2>
      <slot name="actions" />
    </div>
    <div v-if="show.record" class="my-2">
      <slot />
    </div>
  </div>
</template>
