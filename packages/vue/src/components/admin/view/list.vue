<script lang="ts">
/** Props for {@link List}. */
export interface ListProps {
  resource?: string;
  perPage?: number;
  title?: string;
}
</script>

<script setup lang="ts">
/**
 * `<List>` — a list page, the Vue analog of `@chelone/react`'s `views/list.tsx`.
 * Runs `useListController` for the resource and publishes the result into the
 * `ListContext` so a descendant `<DataTable>` reads the SAME controller. Also
 * (re)publishes the resource name so slotted fields/columns resolve it.
 *
 * Resource resolution: the `resource` prop wins, else the ambient `<Resource>`
 * name. The controller is given the resolved name explicitly (a component's own
 * `provide` is not visible to its own `inject`), while `provideResourceContext`
 * exposes it to the CHILDREN (fields/columns).
 */

import { computed } from "vue";
import { useListController } from "../../../controllers/use-list-controller";
import { useTranslate } from "../../../i18n/use-translate";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import { provideListContext } from "../../../list/list-context";
import {
  provideResourceContext,
  useResourceContext,
} from "../../../resource-context";

const props = defineProps<ListProps>();

const resource = props.resource ?? useResourceContext();
if (!resource) {
  throw new Error(
    "<List>: no resource. Pass a `resource` prop or render inside a <Resource>.",
  );
}
provideResourceContext(resource);

const controller = useListController({ resource, perPage: props.perPage });
provideListContext(controller);

const translate = useTranslate();
const getResourceLabel = useGetResourceLabel();
// Computed so a locale change re-titles the page; `translate` reads the locale.
const defaultTitle = computed(() =>
  translate("chelone.page.list", { name: getResourceLabel(resource, 2) }),
);
</script>

<template>
  <div data-slot="list">
    <div class="flex justify-between items-start flex-wrap gap-2 my-2">
      <h2 v-if="title !== ''" class="text-2xl font-bold tracking-tight mb-2">
        {{ title ?? defaultTitle }}
      </h2>
      <div class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>
