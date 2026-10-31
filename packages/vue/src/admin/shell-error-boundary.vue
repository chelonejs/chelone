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
 * Returning `false` stops the error here, so `app.config.errorHandler` does not
 * see a captured error.
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

onErrorCaptured((error, _instance, info) => {
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
