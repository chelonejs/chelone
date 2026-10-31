<script lang="ts">
/** Props for {@link LoadingInput}. */
export interface LoadingInputProps {
  label?: string;
  helperText?: string;
  /** Milliseconds before the spinner replaces the empty placeholder. Defaults to 1000. */
  timeout?: number;
  size?: "default" | "sm";
  fullWidth?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<LoadingInput>` — holds an input's place while its data loads: a disabled,
 * read-only input with a label, the Vue twin of `@chelone/react`'s
 * `inputs/loading-input.tsx`. A spinner appears inside the input's right edge
 * once `timeout` ms have passed, so a fast load never flashes it.
 */

import { computed, useId } from "vue";
import { cn } from "../../../lib/utils";
import Input from "../../ui/input.vue";
import Spinner from "../feedback/spinner.vue";
import { useTimeout } from "../feedback/use-timeout";

const props = withDefaults(defineProps<LoadingInputProps>(), {
  timeout: 1000,
  size: "default",
});

const id = useId();
const showSpinner = useTimeout(props.timeout);

const classes = computed(() =>
  cn("flex flex-col gap-1", props.fullWidth && "w-full", props.class),
);
const inputClasses = computed(() => cn("pr-10", props.size === "sm" && "h-8"));
</script>

<template>
  <fieldset data-slot="loading-input" :class="classes">
    <label v-if="label" :for="id" class="text-sm font-medium">{{ label }}</label>
    <div class="relative">
      <Input
        :id="id"
        model-value=""
        disabled
        readonly
        aria-busy="true"
        :class="inputClasses"
      />
      <span
        class="pointer-events-none absolute inset-y-0 right-3 flex w-5 items-center justify-center"
      >
        <Spinner v-if="showSpinner" size="small" class="size-5" />
      </span>
    </div>
    <p v-if="helperText" class="text-xs text-muted-foreground">
      {{ helperText }}
    </p>
  </fieldset>
</template>
