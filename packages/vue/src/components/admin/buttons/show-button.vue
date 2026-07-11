<script lang="ts">
import type { LooseRecord } from "@chelone/core";

/** Props for {@link ShowButton}. */
export interface ShowButtonProps {
  /** Override the ambient record. */
  record?: LooseRecord;
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
 * `<ShowButton>` — navigates to a record's show page. The Vue twin of
 * `@chelone/react`'s `buttons/show-button.tsx`. Reads the record from the
 * ambient `RecordContext` to build `useCreatePath({ resource, type: 'show', id })`
 * and renders a `<RouterLink>` styled as an outline button. Renders nothing
 * without a record id. See `<CreateButton>` for the shared `translate(...)`
 * label note.
 *
 * R2: gated by `useMenuAccess` on the record — hides while the `show` access
 * check is pending and when denied (allow when access control is unconfigured).
 */

import { computed, inject } from "vue";
import { RouterLink } from "vue-router";
import { useTranslate } from "../../../i18n/use-translate";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import { RecordContextKey } from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import { useCreatePath } from "../../../router";
import { useMenuAccess } from "../layout/use-menu-access";
import { buttonVariants } from "../../ui/button-variants";
import { EyeIcon } from "./icons";

const props = defineProps<ShowButtonProps>();

const resource = useResourceContext(props);
const injectedRecord = inject(RecordContextKey, null);
const record = computed(() => props.record ?? injectedRecord?.value);
const createPath = useCreatePath();
const getResourceLabel = useGetResourceLabel();
const translate = useTranslate();

const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({
    action: "show",
    resource: resource ?? "",
    record: record.value,
  })),
);

const to = computed(() => {
  const id = record.value?.id;
  return id == null ? "" : createPath({ resource, type: "show", id });
});
const label = computed(() =>
  translate("ra.action.show", {
    _: "Show",
    name: resource ? getResourceLabel(resource, 1) : undefined,
  }),
);
const classes = computed(() =>
  buttonVariants({ variant: "outline", class: props.class }),
);
</script>

<template>
  <RouterLink
    v-if="record && record.id != null && !isAccessPending && canAccess"
    :to="to"
    :class="classes"
    :aria-label="label"
    data-slot="show-button"
    @click.stop
  >
    <slot name="icon"><EyeIcon /></slot>
    {{ label }}
  </RouterLink>
</template>
