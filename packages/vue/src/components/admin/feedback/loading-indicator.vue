<script lang="ts">
/** Props for {@link LoadingIndicator}. */
export interface LoadingIndicatorProps {
  /** Extra CSS class appended to the wrapper. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<LoadingIndicator>` — a refresh button that shows a spinner over itself
 * while any query or mutation is in flight. The Vue twin of `@chelone/react`'s
 * `feedback/loading-indicator.tsx`. The button fades out instead of unmounting,
 * so the layout does not shift. The wrapper is 16px; the larger icon button is
 * centred on it and overflows, so the spinner lands on the icon.
 *
 * Emits `click` after the queries are refreshed.
 *
 * @example
 * <LoadingIndicator />
 */

import { computed } from "vue";
import { useLoading, useRefresh } from "../../../data/use-refresh";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import Spinner from "../../ui/spinner.vue";
import { RotateCwIcon } from "../buttons/icons";
import IconButtonWithTooltip from "../common/icon-button-with-tooltip.vue";

const props = defineProps<LoadingIndicatorProps>();
const emit = defineEmits<{ click: [] }>();

const loading = useLoading();
const refresh = useRefresh();
const translate = useTranslate();

const wrapperClass = computed(() => cn("relative size-4", props.class));
const buttonClass = computed(() =>
  cn(
    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    loading.value && "pointer-events-none opacity-0",
  ),
);

function onClick(): void {
  refresh();
  emit("click");
}
</script>

<template>
  <div :class="wrapperClass">
    <IconButtonWithTooltip
      label="chelone.action.refresh"
      :class="buttonClass"
      :tabindex="loading ? -1 : undefined"
      :aria-hidden="loading ? 'true' : undefined"
      @click="onClick"
    >
      <RotateCwIcon />
    </IconButtonWithTooltip>
    <Spinner
      v-if="loading"
      :aria-label="translate('chelone.page.loading', { _: 'Loading' })"
      class="absolute inset-0"
    />
  </div>
</template>
