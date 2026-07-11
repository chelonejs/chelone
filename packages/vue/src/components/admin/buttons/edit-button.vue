<script lang="ts">
import type { LooseRecord } from "@chelone/core";

/** Props for {@link EditButton}. */
export interface EditButtonProps {
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
 * `<EditButton>` — navigates to a record's edit page. The Vue twin of
 * `@chelone/react`'s `buttons/edit-button.tsx`. Reads the record from the
 * ambient `RecordContext` (a `<DataTable>` row, an `<Edit>`/`<Show>` view) to
 * build `useCreatePath({ resource, type: 'edit', id })`, and renders a
 * `<RouterLink>` styled as an outline button. Renders nothing when there is no
 * record id. See `<CreateButton>` for the shared `translate(...)` label note.
 *
 * R2: gated by `useMenuAccess` on the record — hides while the `edit` access
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
import { PencilIcon } from "./icons";

const props = defineProps<EditButtonProps>();

const resource = useResourceContext(props);
// Inject the ambient record REF once (reactive) and honor a `record` prop
// override — so an async-loading `<Show>`/`<Edit>` record flows through.
const injectedRecord = inject(RecordContextKey, null);
const record = computed(() => props.record ?? injectedRecord?.value);
const createPath = useCreatePath();
const getResourceLabel = useGetResourceLabel();
const translate = useTranslate();

const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({
    action: "edit",
    resource: resource ?? "",
    record: record.value,
  })),
);

const to = computed(() => {
  const id = record.value?.id;
  return id == null ? "" : createPath({ resource, type: "edit", id });
});
const label = computed(() =>
  translate("ra.action.edit", {
    _: "Edit",
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
    data-slot="edit-button"
    @click.stop
  >
    <slot name="icon"><PencilIcon /></slot>
    {{ label }}
  </RouterLink>
</template>
