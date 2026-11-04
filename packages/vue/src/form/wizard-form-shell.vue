<script lang="ts">
/** Props for {@link WizardFormShell}. */
export interface WizardFormShellProps {
  stepNames: readonly string[];
  submit: () => Promise<void>;
}
</script>

<script setup lang="ts">
/**
 * Internal to `<WizardForm>`. `useForm` provides the form to descendants only,
 * so the wizard's own component cannot read the form it just built. This child
 * can: it builds `validateStep` from the ambient form and the form groups
 * registry, runs the controller and provides it.
 */
import { computed } from "vue";
import { useCheloneFormContext } from "./form-context";
import { useFormGroups } from "./form-groups";
import { provideWizardForm, useWizardForm } from "./use-wizard-form";

const props = defineProps<WizardFormShellProps>();

const { form } = useCheloneFormContext();
const groups = useFormGroups();

async function validateStep(stepName: string): Promise<boolean> {
  const members = groups.getMembers(stepName);
  if (members.length === 0) return true;
  // The submit cause marks each field touched, then runs its validators.
  await Promise.all(
    members.map((source) =>
      Promise.resolve(form.ambient.validateField(source, "submit")),
    ),
  );
  const fieldMeta = form.ambient.store.state.fieldMeta as Record<
    string,
    { isValid: boolean } | undefined
  >;
  return members.every((source) => fieldMeta[source]?.isValid !== false);
}

const wizard = useWizardForm(
  () => props.stepNames,
  () => props.submit(),
  validateStep,
);
const activeStep = computed(() => props.stepNames[wizard.currentStep.value]);
provideWizardForm(wizard, activeStep);
</script>

<template>
  <slot />
</template>
