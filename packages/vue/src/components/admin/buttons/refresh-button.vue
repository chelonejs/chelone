<script lang="ts">
/** Props for {@link RefreshButton}. */
export interface RefreshButtonProps {
  /** Override the auto-translated aria-label. */
  label?: string;
  /** Extra CSS class appended to the button. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<RefreshButton>` — reloads the current view's data. The Vue twin of
 * `@chelone/react`'s `buttons/refresh-button.tsx`. On click, `useRefresh()`
 * invalidates every query so the active ones refetch; `useLoading()` (a reactive
 * OR of vue-query's fetching + mutating counts) drives the spinner + disables
 * the button while any request is in flight. A ghost icon button.
 */

import { computed } from "vue";
import { useLoading, useRefresh } from "../../../data/use-refresh";
import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";
import { RotateCwIcon } from "./icons";

const props = defineProps<RefreshButtonProps>();

const refresh = useRefresh();
const loading = useLoading();
const translate = useTranslate();

const label = computed(() =>
  translate("chelone.action.refresh", { _: props.label ?? "Refresh" }),
);

function onClick(): void {
  refresh();
}
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="icon"
    :disabled="loading"
    :class="props.class"
    :aria-label="label"
    data-slot="refresh-button"
    @click="onClick"
  >
    <span
      v-if="loading"
      data-slot="refresh-spinner"
      class="animate-spin"
      aria-hidden="true"
      >…</span
    >
    <RotateCwIcon v-else />
  </Button>
</template>
