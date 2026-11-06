<script lang="ts">
/** Props for {@link Title}. */
export interface TitleProps {
  /**
   * The title to display, translated via the i18n provider (with the string
   * itself as the fallback). For a custom title node, use the default slot
   * instead — the Vue idiom replacing the React twin's `title={<element>}`.
   */
  title?: string;
  /** Fallback title used when `title` is undefined. Translated if present. */
  defaultTitle?: string;
  /** Optional CSS class applied to the rendered title element. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Title>` — teleports a page title into the `<TitlePortal>` slot in the app
 * bar. The Vue twin of `@chelone/react`'s `layout/title.tsx`.
 *
 * Mirrors the react-admin `<Title>` API so a view declares its own page title
 * without knowing where it lives in the DOM. Divergences from the React twin:
 * teleport uses Vue's built-in `<Teleport>` (not `createPortal`), and a custom
 * (non-string) title is passed via the default slot rather than a VNode prop.
 * The target element is resolved on mount (after `<TitlePortal>` exists); until
 * it resolves — or when no portal is present — the component renders nothing,
 * matching the React twin's "renders nothing without a target".
 */

import { computed, nextTick, onMounted, ref, type VNode } from "vue";
import { cn } from "../../../lib/utils";
import { useTranslate } from "../../../i18n/use-translate";
import { TITLE_PORTAL_ID } from "./title-portal-id";

const props = defineProps<TitleProps>();
const slots = defineSlots<{
  /** A custom title node rendered verbatim (replaces the translated string). */
  default?: () => VNode[];
}>();

const translate = useTranslate();
const target = ref<HTMLElement | null>(null);

// Resolve the portal target after mount so `<TitlePortal>` (which may mount in
// the same pass) is already in the DOM. `nextTick` covers ordering where the
// portal mounts after this component within the same flush.
onMounted(async () => {
  const resolve = () =>
    typeof document !== "undefined"
      ? document.getElementById(TITLE_PORTAL_ID)
      : null;
  target.value = resolve();
  if (!target.value) {
    await nextTick();
    target.value = resolve();
  }
});

const value = computed(() => props.title ?? props.defaultTitle ?? "");
const translated = computed(() =>
  value.value ? translate(value.value, { _: value.value }) : "",
);
const hasCustom = computed(() => slots.default != null);
</script>

<template>
  <Teleport v-if="target" :to="target">
    <slot v-if="hasCustom" />
    <h1 v-else :class="cn('truncate text-lg font-semibold', props.class)">
      {{ translated }}
    </h1>
  </Teleport>
</template>
