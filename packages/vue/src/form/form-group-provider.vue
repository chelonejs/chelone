<script lang="ts">
/** Props for {@link FormGroupProvider}. */
export interface FormGroupProviderProps {
  /** The group name inputs below auto-register into (tab/step name). */
  name: string;
}
</script>

<script setup lang="ts">
/**
 * `<FormGroupProvider>` — scopes every `useInput` below into the named group.
 * Nest under `<FormGroupsProvider>`. Renders its default slot only.
 */
import { provideFormGroup } from "./form-groups";

const props = defineProps<FormGroupProviderProps>();
provideFormGroup(props.name);
</script>

<template>
  <slot />
</template>
