<script lang="ts">
/** Props for {@link RefreshIconButton}. */
export interface RefreshIconButtonProps {
  /** A message key, translated with itself as the fallback. */
  label?: string;
  /** Extra CSS class appended to the button. */
  class?: string;
}

const defaultLabel = "chelone.action.refresh";
</script>

<script setup lang="ts">
/**
 * `<RefreshIconButton>` — a ghost icon button that reloads the current view's
 * data. The Vue twin of `@chelone/react`'s `buttons/refresh-icon-button.tsx`;
 * unlike `<RefreshButton>` it has no loading state. Vue ships no `Tooltip`
 * primitive, so the translated label names the button through `aria-label` and
 * a native `title`.
 */

import { computed } from "vue";
import { useRefresh } from "../../../data/use-refresh";
import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";
import { RotateCwIcon } from "./icons";

const props = withDefaults(defineProps<RefreshIconButtonProps>(), {
  label: defaultLabel,
});
const emit = defineEmits<{ click: [event: MouseEvent] }>();

const refresh = useRefresh();
const translate = useTranslate();

const text = computed(() =>
  translate(props.label, {
    _: props.label === defaultLabel ? "Refresh" : props.label,
  }),
);

function onClick(event: MouseEvent): void {
  event.preventDefault();
  refresh();
  emit("click", event);
}
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="icon"
    :class="props.class"
    :aria-label="text"
    :title="text"
    data-slot="refresh-icon-button"
    @click="onClick"
  >
    <slot name="icon"><RotateCwIcon /></slot>
  </Button>
</template>
