<script lang="ts">
/** Props for {@link CountSpinner}. */
export interface CountSpinnerProps {
  /** Milliseconds to wait before the spinner shows. */
  timeout: number;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * The pending state of a `<Count>`: nothing until `timeout` ms after it mounts,
 * then a spinner. `<Count>` mounts it per pending period, so every uncached load
 * restarts the wait.
 */

import Spinner from "../../ui/spinner.vue";
import { useTimeout } from "../feedback/use-timeout";

const props = defineProps<CountSpinnerProps>();
const timedOut = useTimeout(props.timeout);
</script>

<template>
  <Spinner v-if="timedOut" :class="props.class" />
</template>
