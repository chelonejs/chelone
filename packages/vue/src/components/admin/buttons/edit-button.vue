<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import {
  definedParams,
  type LooseRecord,
  type ResourceRecord,
} from "@chelone/core";
import type { RecordLinkButtonProps } from "./record-button-props";

/** Props for {@link EditButton}. */
export interface EditButtonProps<
  TRecord extends ResourceRecord = LooseRecord,
> extends RecordLinkButtonProps<TRecord> {}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
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

import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useTranslate } from "../../../i18n/use-translate";
import { useGetResourceLabel } from "../../../label/use-get-resource-label";
import { useRecordContextRef } from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import { useCreatePath } from "../../../router";
import { useMenuAccess } from "../layout/use-menu-access";
import { buttonVariants } from "../../ui/button-variants";
import { PencilIcon } from "./icons";

const props = defineProps<EditButtonProps<TRecord>>();

const resource = useResourceContext(props);
const record = useRecordContextRef<TRecord | LooseRecord>(() => props.record);
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
  translate(
    "chelone.action.edit",
    definedParams({
      _: "Edit",
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
