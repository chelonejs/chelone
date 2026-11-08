<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord } from "@chelone/core";
import type { RecordLinkButtonProps } from "./record-button-props";

/** Props for {@link CloneButton}. */
export interface CloneButtonProps<
  TRecord extends ResourceRecord = LooseRecord,
> extends RecordLinkButtonProps<TRecord> {}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
/**
 * `<CloneButton>` — opens the create page pre-filled with a copy of a record.
 * The Vue twin of `@chelone/react`'s `buttons/clone-button.tsx`. The record
 * (minus its `id`) travels in `?source=` as JSON; `<Create>` reads it back with
 * `getRecordFromLocation`. Renders nothing without a record id, while the
 * `create` access check is pending and when it is denied. The `click` stops
 * propagating so a button inside a clickable `<DataTable>` row does not also
 * trigger the row. See `<CreateButton>` for the shared label note.
 */

import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useTranslate } from "../../../i18n/use-translate";
import { useRecordContextRef } from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import { useCreatePath } from "../../../router";
import { buttonVariants } from "../../ui/button-variants";
import { useMenuAccess } from "../layout/use-menu-access";
import { CopyIcon } from "./icons";

const props = defineProps<CloneButtonProps<TRecord>>();

const resource = useResourceContext(props);
const record = useRecordContextRef<TRecord | LooseRecord>(() => props.record);
const createPath = useCreatePath();
const translate = useTranslate();

const { canAccess, isPending: isAccessPending } = useMenuAccess(
  computed(() => ({ action: "create", resource: resource ?? "" })),
);

const to = computed(() => {
  if (!record.value) return "";
  const { id: _id, ...copy } = record.value;
  return `${createPath({ resource, type: "create" })}?source=${encodeURIComponent(JSON.stringify(copy))}`;
});
const label = computed(
  () => props.label ?? translate("chelone.action.clone", { _: "Clone" }),
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
    data-slot="clone-button"
    @click.stop
  >
    <slot name="icon"><CopyIcon /></slot>
    {{ label }}
  </RouterLink>
</template>
