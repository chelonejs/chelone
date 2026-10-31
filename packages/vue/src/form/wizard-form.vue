<script lang="ts">
import type { OptionalSaveFormProps } from "./form-scope";

/**
 * Props for {@link WizardForm}. With `save` the form builds its own form and
 * takes every form option; without it the form drives the one of the view above
 * it (`<Edit>`, `<Create>`), which takes the other options.
 */
export type WizardFormProps<TFormData> = OptionalSaveFormProps<TFormData>;
</script>

<script setup lang="ts" generic="TFormData">
/**
 * `<WizardForm>` — one form split into steps, the twin of `@chelone/react`'s
 * `wizard-form.tsx`. Steps are the `<WizardFormStep>` vnodes of the default
 * slot, in order. Every step stays mounted (inactive ones are `hidden`) so one
 * submit collects the whole form. `next()` validates the current step's fields
 * before advancing; per-step membership reuses form groups. There are no
 * built-in step buttons: call `useWizardFormContext()` from the author's own.
 */
import { Fragment, useSlots, type VNode } from "vue";
import { useFormScope } from "./form-scope";
import { provideFormGroups } from "./form-groups";
import WizardFormShell from "./wizard-form-shell.vue";
import WizardFormStep from "./wizard-form-step.vue";

const props = withDefaults(defineProps<WizardFormProps<TFormData>>(), {
  resetOnSuccess: true,
});
const slots = useSlots();

const submit = useFormScope<TFormData>("WizardForm", props);
provideFormGroups();

/** Flatten fragments so a `v-for` of steps is read like written-out ones. */
function collectSteps(nodes: VNode[]): string[] {
  const names: string[] = [];
  for (const node of nodes) {
    if (node.type === Fragment && Array.isArray(node.children)) {
      names.push(...collectSteps(node.children as VNode[]));
    } else if (node.type === WizardFormStep) {
      names.push(String(node.props?.name));
    }
  }
  return names;
}

/**
 * Read from the slot on every render: a slot call outside render warns. The
 * previous array is kept while the names match, so the shell is not re-rendered
 * for a slot that did not change its steps.
 */
let stepNames: string[] = [];
function readSteps(): string[] {
  const next = collectSteps(slots.default?.() ?? []);
  if (
    next.length !== stepNames.length ||
    next.some((name, i) => name !== stepNames[i])
  ) {
    stepNames = next;
  }
  return stepNames;
}
</script>

<template>
  <WizardFormShell :step-names="readSteps()" :submit="submit">
    <slot />
  </WizardFormShell>
</template>
