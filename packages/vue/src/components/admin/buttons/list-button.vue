<script lang="ts">
/** Props for {@link ListButton}. */
export interface ListButtonProps {
  /** Override the ambient `<Resource>`. */
  resource?: string;
  /** Override the auto-translated label. */
  label?: string;
  /** Extra CSS class appended to the anchor. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ListButton>` — navigates to a resource's list page. The Vue twin of
 * `@chelone/react`'s `buttons/list-button.tsx`. Commonly placed in an
 * `<Edit>`/`<Show>` view's actions to go back to the list. Renders a
 * `<RouterLink>` styled as an outline button to `useCreatePath({ type: 'list',
 * resource })`. Throws when no resource is in scope (parity — a `<ListButton>`
 * with no resource is a misuse). See `<CreateButton>` for the divergence notes.
 */

import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useTranslate } from "../../../i18n/use-translate";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import { useResourceContext } from "../../../resource-context";
import { useCreatePath } from "../../../router";
import { buttonVariants } from "../../ui/button-variants";
import { ListIcon } from "./icons";

const props = defineProps<ListButtonProps>();

const ambientResource = useResourceContext(props);
if (!ambientResource) {
  throw new Error(
    "<ListButton> must be used inside a <Resource> or given a `resource` prop.",
  );
}
const resource: string = ambientResource;
const createPath = useCreatePath();
const getResourceLabel = useGetResourceLabel();
const translate = useTranslate();

const to = computed(() => createPath({ type: "list", resource }));
const label = computed(() =>
  translate("chelone.action.list", {
    _: "List",
    name: getResourceLabel(resource, 1),
  }),
);
const classes = computed(() =>
  buttonVariants({ variant: "outline", class: props.class }),
);
</script>

<template>
  <RouterLink
    :to="to"
    :class="classes"
    :aria-label="label"
    data-slot="list-button"
    @click.stop
  >
    <slot name="icon"><ListIcon /></slot>
    {{ label }}
  </RouterLink>
</template>
