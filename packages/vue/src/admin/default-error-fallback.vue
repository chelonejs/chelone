<script lang="ts">
/** Props for {@link DefaultErrorFallback}, and the scope of the `#error` slot. */
export interface ErrorFallbackProps {
  /** The thrown error. */
  error: Error;
  /** Vue's description of where the error was thrown (a lifecycle or render hook name). */
  info: string;
  /** Clear the error and render the wrapped view again. */
  reset: () => void;
}
</script>

<script setup lang="ts">
/**
 * The built-in shell fallback, the Vue twin of React's `DefaultErrorFallback`:
 * deliberately plain, so a throwing route degrades to something readable
 * instead of a blank page. Replace it with the `#error` slot on `<Admin>`.
 */
defineProps<ErrorFallbackProps>();
</script>

<template>
  <div role="alert" data-chelone="error-boundary">
    <h1>Something went wrong.</h1>
    <p>{{ error.message }}</p>
    <button type="button" @click="reset()">Try again</button>
  </div>
</template>
