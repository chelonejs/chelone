<script lang="ts">
/** Props for {@link CheckForApplicationUpdate}. */
export interface CheckForApplicationUpdateProps {
  /** Page to fingerprint. Defaults to `${location.origin}/index.html`. */
  url?: string;
  /** Milliseconds between checks. Defaults to one hour. */
  interval?: number;
  /** Read at each check. `cache: "no-store"` always overrides it. */
  fetchOptions?: RequestInit | (() => RequestInit);
  /** Never fetch. Defaults to `true` outside production. */
  disabled?: boolean;
  /** Called once, when a new build is found. */
  onNewVersionAvailable?: () => void;
}
</script>

<script setup lang="ts">
/**
 * `<CheckForApplicationUpdate>` — shows a notice once a new build of the app is
 * deployed. The Vue twin of `@chelone/react`'s
 * `common/check-for-application-update.tsx`.
 *
 * Renders nothing until the deployed page's body differs from the first one
 * fetched, then the `notification` slot (default `<ApplicationUpdatedNotification />`).
 * Polls hourly by default and never polls outside production unless
 * `:disabled="false"`. Not mounted by `<Layout>`: render it where the app wants
 * the notice.
 *
 * @example
 * <CheckForApplicationUpdate :interval="600_000" />
 */

import { toRef } from "vue";
import { useCheckForApplicationUpdate } from "../../../data/use-check-for-application-update";
import ApplicationUpdatedNotification from "./application-updated-notification.vue";

// `disabled: undefined` stops Vue casting an absent boolean prop to `false`,
// which would defeat the hook's "disabled outside production" default.
const props = withDefaults(defineProps<CheckForApplicationUpdateProps>(), {
  disabled: undefined,
});

const hasNewVersion = useCheckForApplicationUpdate({
  url: toRef(props, "url"),
  interval: toRef(props, "interval"),
  disabled: toRef(props, "disabled"),
  fetchOptions: toRef(props, "fetchOptions"),
  onNewVersionAvailable: toRef(props, "onNewVersionAvailable"),
});
</script>

<template>
  <slot v-if="hasNewVersion" name="notification">
    <ApplicationUpdatedNotification />
  </slot>
</template>
