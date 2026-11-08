<script lang="ts">
/** Props for {@link SelectAllButton}. */
export interface SelectAllButtonProps {
  /** A message key, translated with itself as the fallback. */
  label?: string;
  /** The most rows to select. */
  limit?: number;
  /** Extra CSS class appended to the button. */
  class?: string;
}

const defaultLabel = "chelone.action.select_all";
</script>

<script setup lang="ts">
/**
 * `<SelectAllButton>` — selects up to `limit` rows of the list, beyond the
 * current page. The Vue twin of `@chelone/react`'s `buttons/select-all-button.tsx`.
 * Renders nothing until every row of the current page is selected, and again once
 * the whole list or `limit` rows are selected. Emits `click` once the selection
 * has landed.
 */

import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import Button from "../../ui/button.vue";

const props = withDefaults(defineProps<SelectAllButtonProps>(), {
  label: defaultLabel,
  limit: 250,
});
const emit = defineEmits<{ click: [] }>();

const list = useListContext();
const translate = useTranslate();

const text = computed(() =>
  translate(props.label, {
    _: props.label === defaultLabel ? "Select all" : props.label,
  }),
);

const visible = computed(() => {
  const { data, total, selectedIds } = list;
  if (data === undefined) return false;
  if (total === selectedIds.length) return false;
  if (selectedIds.length >= props.limit) return false;
  return data.every((record) => selectedIds.includes(record.id));
});

async function onClick(event: MouseEvent): Promise<void> {
  event.preventDefault();
  await list.selectAll({ limit: props.limit });
  emit("click");
}
</script>

<template>
  <Button
    v-if="visible"
    type="button"
    variant="ghost"
    size="sm"
    :class="props.class"
    data-slot="select-all-button"
    @click="onClick"
  >
    {{ text }}
  </Button>
</template>
