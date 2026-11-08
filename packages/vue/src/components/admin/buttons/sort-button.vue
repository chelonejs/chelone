<script lang="ts">
import type { SourceProp } from "@chelone/core";

/** Props for {@link SortButton}. */
export interface SortButtonProps {
  /** The sortable field names offered in the dropdown. */
  fields: SourceProp[];
  /** Override the auto-translated button label. */
  label?: string;
  /** Extra CSS class appended to the trigger. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<SortButton>` — a dropdown to change the list sort. The Vue twin of
 * `@chelone/react`'s `buttons/sort-button.tsx`, rebridged onto chelone's
 * first-class multi-sort slice: it reads the PRIMARY column via
 * `useListContext().sort[0]` (falling back to a default) and calls the
 * controller `setSort({ field, order })`. The controller itself toggles
 * ASC/DESC when the same single field is re-selected (ra-core column-header
 * semantics), so this only computes the NEXT order for the menu-item labels.
 *
 * Divergence from the React twin: field labels come from `humanizeSource(...)`
 * (the Vue slice has no `useTranslateLabel` chain yet), and the mobile
 * icon-only / tooltip variants are not ported (no Vue `<Tooltip>` primitive).
 */

import { computed } from "vue";
import type { SortPayload } from "@chelone/core";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import { humanizeSource } from "../inputs/label-text";
import Button from "../../ui/button.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { ArrowUpDownIcon, ChevronDownIcon } from "./icons";

const props = defineProps<SortButtonProps>();

const DEFAULT_SORT: SortPayload = { field: "id", order: "DESC" };
const inverse = (order: "ASC" | "DESC"): "ASC" | "DESC" =>
  order === "ASC" ? "DESC" : "ASC";

const list = useListContext();
const translate = useTranslate();

const primary = computed<SortPayload>(
  () => list.sort[0] ?? DEFAULT_SORT,
);

const orderLabel = (order: "ASC" | "DESC"): string =>
  translate(`chelone.sort.${order}`, { _: order });

const buttonLabel = computed(() =>
  translate("chelone.sort.sort_by", {
    _:
      props.label ??
      `Sort by ${humanizeSource(primary.value.field)} ${orderLabel(
        primary.value.order,
      )}`,
    field: humanizeSource(primary.value.field),
    order: orderLabel(primary.value.order),
  }),
);

/** The order a click on `field` would apply (for the menu-item label). */
function nextOrder(field: string): "ASC" | "DESC" {
  return field === primary.value.field ? inverse(primary.value.order) : "ASC";
}

function onSelect(field: string): void {
  list.setSort({ field, order: nextOrder(field) });
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button
        variant="outline"
        size="sm"
        class="h-9"
        :class="props.class"
        :aria-label="buttonLabel"
        data-slot="sort-button"
      >
        <ArrowUpDownIcon />
        <span>{{ buttonLabel }}</span>
        <ChevronDownIcon />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuItem
        v-for="field in fields"
        :key="field"
        :data-field="field"
        @select="onSelect(field)"
      >
        {{ humanizeSource(field) }} {{ orderLabel(nextOrder(field)) }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
