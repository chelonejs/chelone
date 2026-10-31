<script setup lang="ts">
/**
 * The shell error boundary, the Vue twin of React's `ShellErrorBoundary`.
 * `onErrorCaptured` keeps the first error from the wrapped tree and swaps the
 * default slot for a fallback.
 *
 * The error clears when `location.pathname` changes, not on a search or hash
 * change, and the boundary has no `key`: the wrapped layout and its form state
 * survive every navigation.
 *
 * Only errors from setup, render and the creation and mount hooks are
 * captured, as in React: a failed event handler or watcher propagates and
 * leaves the page usable. Returning `false` stops a captured error here, so
 * `app.config.errorHandler` does not see it.
 */

import { onErrorCaptured, shallowRef, watch } from "vue";
import { useLocation } from "../router/nav-composables";
import DefaultErrorFallback, {
  type ErrorFallbackProps,
} from "./default-error-fallback.vue";

defineSlots<{
  /** The wrapped tree. */
  default?: () => unknown;
  /** Replaces the default fallback. */
  error?: (props: ErrorFallbackProps) => unknown;
}>();

const captured = shallowRef<{ error: Error; info: string } | null>(null);

// Vue names the source in dev builds and links `#runtime-<code>` in production.
const CAPTURED_SOURCES = new Set([
  "setup function",
  "render function",
  "beforeCreate hook",
  "created hook",
  "beforeMount hook",
  "mounted hook",
  "0",
  "1",
  "bc",
  "c",
  "bm",
  "m",
]);

function isCapturedSource(info: string) {
  return CAPTURED_SOURCES.has(info.split("#runtime-").pop() ?? info);
}

onErrorCaptured((error, _instance, info) => {
  // Later errors, such as one thrown by the fallback itself or by the tree
  // unmounting, propagate so the first cause stays on screen and no loop starts.
  if (captured.value || !isCapturedSource(info)) return;
  // A rethrow of a non-Error still needs a message to show.
  captured.value = {
    error: error instanceof Error ? error : new Error(String(error)),
    info,
  };
  return false;
});

function reset() {
  captured.value = null;
}

const location = useLocation();
watch(() => location.value.pathname, reset);
</script>

<template>
  <slot
    v-if="captured"
    name="error"
    :error="captured.error"
    :info="captured.info"
    :reset="reset"
  >
    <DefaultErrorFallback
      :error="captured.error"
      :info="captured.info"
      :reset="reset"
    />
  </slot>
  <slot v-else />
</template>
