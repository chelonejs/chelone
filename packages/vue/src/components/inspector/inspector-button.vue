<script lang="ts">
/** Props for {@link InspectorButton}. */
export interface InspectorButtonProps {
  /** A message key, translated with itself as the fallback. */
  label?: string;
  class?: string;
  disabled?: boolean;
}
</script>

<script setup lang="ts">
/**
 * `<InspectorButton>` — a ghost icon button that turns the inspector's
 * configure mode on and off. The Vue twin of `@chelone/react`'s
 * `InspectorButton`. It renders nothing where no `<Inspector>` is mounted, so
 * a shared toolbar can hold it in every app.
 *
 * A `click` listener runs first, and its `preventDefault` keeps the mode as it
 * is. The `#icon` slot replaces the glyph.
 *
 * @example
 * <InspectorButton />
 */

import { computed } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { SlidersHorizontalIcon } from "../admin/buttons/icons";
import Button from "../ui/button.vue";
import { useInspector } from "./inspector-context";

defineOptions({ inheritAttrs: false });

const props = defineProps<InspectorButtonProps>();
const emit = defineEmits<{ click: [event: MouseEvent] }>();

const translate = useTranslate();
const inspector = useInspector();

const defaultLabel = "chelone.inspector.configure_mode";
const text = computed(() =>
  translate(props.label ?? defaultLabel, {
    _: props.label === undefined ? "Configure mode" : props.label,
  }),
);

function onClick(event: MouseEvent) {
  emit("click", event);
  if (!event.defaultPrevented) inspector?.value.toggle();
}
</script>

<template>
  <Button
    v-if="inspector"
    variant="ghost"
    size="icon"
    :aria-label="text"
    :title="text"
    v-bind="$attrs"
    :class="props.class"
    :disabled="props.disabled"
    :aria-pressed="inspector.enabled"
    @click="onClick"
  >
    <slot name="icon"><SlidersHorizontalIcon /></slot>
  </Button>
</template>
