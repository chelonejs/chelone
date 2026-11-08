<script lang="ts">
/** Props for {@link Loading}. */
export interface LoadingProps {
  /** Primary heading i18n key. Default `"chelone.page.loading"`. */
  loadingPrimary?: string;
  /** Secondary line i18n key. Default `"chelone.message.loading_detail"`. */
  loadingSecondary?: string;
  /** Delay (ms) before the indicator appears. Default `1000`. */
  delay?: number;
}
</script>

<script setup lang="ts">
/**
 * `<Loading>` — the deferred loading indicator for slow element/page loads. The
 * Vue twin of `@chelone/react`'s `feedback/loading.tsx`. Shows a spinner +
 * translated primary/secondary messages, but only after `delay` ms so a fast
 * response never flashes it (works as the default `<Layout>` slow-load fallback).
 *
 * Idiom translation: React's `useTimeout` + `<Translate>` become the Vue
 * `useTimeout` ref and the `useTranslate()` function with the polyglot `_`
 * fallback (chelone has no `<Translate>` component).
 */

import { useTranslate } from "../../../i18n/use-translate";
import Spinner from "./spinner.vue";
import { useTimeout } from "./use-timeout";

const props = withDefaults(defineProps<LoadingProps>(), {
  loadingPrimary: "chelone.page.loading",
  loadingSecondary: "chelone.message.loading_detail",
  delay: 1000,
});

const translate = useTranslate();
const ready = useTimeout(props.delay);
</script>

<template>
  <div
    v-if="ready"
    class="flex flex-col justify-center items-center h-full"
    role="status"
    aria-live="polite"
  >
    <div class="text-center font-sans text-muted-foreground py-1">
      <div class="flex justify-center">
        <Spinner size="large" class="size-9" />
      </div>
      <h5 class="mt-3 text-2xl text-secondary-foreground">
        {{ translate(loadingPrimary, { _: loadingPrimary }) }}
      </h5>
      <p class="text-primary">
        {{ translate(loadingSecondary, { _: loadingSecondary }) }}
      </p>
    </div>
  </div>
</template>
