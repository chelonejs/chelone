<script lang="ts">
import type { FormGroups } from "@chelone/core";

/** Props for {@link FormGroupsProvider}. */
export interface FormGroupsProviderProps {
  /** An externally created registry (advanced/testing). Omit to create one. */
  groups?: FormGroups;
}
</script>

<script setup lang="ts">
/**
 * `<FormGroupsProvider>` — provides one `FormGroups` registry to the form
 * subtree. Renders its default slot only; place it below the form's `useForm`.
 */
import { provideFormGroups } from "./form-groups";

const props = defineProps<FormGroupsProviderProps>();
provideFormGroups(() => props.groups);
</script>

<template>
  <slot />
</template>
