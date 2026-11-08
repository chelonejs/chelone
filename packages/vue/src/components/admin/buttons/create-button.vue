<script lang="ts">
/** Props for {@link CreateButton}. */
export interface CreateButtonProps {
  /** Override the ambient `<Resource>` this button targets. */
  resource?: string;
  /** Override the auto-translated label. */
  label?: string;
  /** Extra CSS class appended to the anchor. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<CreateButton>` — navigates to a resource's create page. The Vue twin of
 * `@chelone/react`'s `buttons/create-button.tsx`. Renders a vue-router
 * `<RouterLink>` (an `<a>` — same anchor semantics as the React `Link`: middle-
 * click / open-in-new-tab work) styled with the shadcn `buttonVariants` recipe,
 * to the path from `useCreatePath({ resource, type: 'create' })`.
 *
 * Divergences from the React twin (deliberate, matching the rest of the Vue V3
 * surface): the label uses `translate(key, { _, name })` rather than the React
 * `useResourceTranslation` chain (no Vue twin yet). The icon defaults to
 * `<PlusIcon>`; override via the `#icon` slot.
 *
 * R2: gated by `useMenuAccess` (the no-throw `useCanAccess`) — the button hides
 * while the `create` access check is pending and when access is denied (allow
 * when access control is unconfigured).
 */

import { definedParams } from "@chelone/core";
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useTranslate } from "../../../i18n/use-translate";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import { useResourceContext } from "../../../resource-context";
import { useCreatePath } from "../../../router";
import { useMenuAccess } from "../layout/use-menu-access";
import { buttonVariants } from "../../ui/button-variants";
import { PlusIcon } from "./icons";

const props = defineProps<CreateButtonProps>();

const resource = useResourceContext(props);
const createPath = useCreatePath();
const getResourceLabel = useGetResourceLabel();
const translate = useTranslate();

const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({ action: "create", resource: resource ?? "" })),
);
const show = computed(() => !isAccessPending.value && canAccess.value);

const to = computed(() => createPath({ resource, type: "create" }));
const label = computed(() =>
  translate(
    "chelone.action.create",
    definedParams({
      _: "Create",
      name: resource ? getResourceLabel(resource, 1) : undefined,
    }),
  ),
);
const classes = computed(() =>
  buttonVariants({ variant: "outline", class: props.class }),
);
</script>

<template>
  <RouterLink
    v-if="show"
    :to="to"
    :class="classes"
    :aria-label="label"
    data-slot="create-button"
    @click.stop
  >
    <slot name="icon"><PlusIcon /></slot>
    {{ label }}
  </RouterLink>
</template>
