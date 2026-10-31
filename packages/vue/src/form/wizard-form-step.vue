<script lang="ts">
/** Props for {@link WizardFormStep}. */
export interface WizardFormStepProps {
  /** The step name, also its form group name: its inputs register into it. */
  name: string;
}
</script>

<script setup lang="ts">
/**
 * `<WizardFormStep>` — one step of a `<WizardForm>`. Its inputs register into a
 * form group named `name`, so `next()` can validate exactly this step's fields.
 * The step stays mounted and is `hidden` unless active, so values and
 * validation in other steps survive navigation.
 */
import { computed } from "vue";
import { provideFormGroup } from "./form-groups";
import { useActiveWizardStep } from "./use-wizard-form";

const props = defineProps<WizardFormStepProps>();
provideFormGroup(() => props.name);

const activeStep = useActiveWizardStep();
const hidden = computed(() => activeStep.value !== props.name);
</script>

<template>
  <div :data-chelone-wizard-step="name" :hidden="hidden">
    <slot />
  </div>
</template>
