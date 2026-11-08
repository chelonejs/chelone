<script lang="ts">
/** Props for {@link Offline}. */
export interface OfflineProps {
  /** Extra CSS class: on the slot's `div`, or appended to the banner's classes. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<Offline>` — tells the user the browser has lost its connection. The Vue twin
 * of `@chelone/react`'s `feedback/offline.tsx`. Renders nothing while online.
 * Offline, it renders the default slot in a `div`, or a fixed top banner when
 * there is none. Not mounted by `<Layout>`: place it where the app wants the
 * warning.
 *
 * @example
 * <Offline />
 */

import { computed } from "vue";
import { useIsOffline } from "../../../data/use-is-offline";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { WifiOffIcon } from "./icons";

const props = defineProps<OfflineProps>();

const isOffline = useIsOffline();
const translate = useTranslate();

const bannerClass = computed(() =>
  cn(
    "fixed top-0 inset-x-0 z-50 bg-destructive text-white px-4 py-2 flex items-center justify-center gap-2 text-sm",
    props.class,
  ),
);
</script>

<template>
  <div v-if="isOffline && $slots.default" :class="props.class">
    <slot />
  </div>
  <div v-else-if="isOffline" role="status" aria-live="polite" :class="bannerClass">
    <WifiOffIcon class="size-4" />
    {{ translate("chelone.notification.offline", { _: "You are offline" }) }}
  </div>
</template>
