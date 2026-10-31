/**
 * The wizard controller of `<WizardForm>`, the twin of `@chelone/react`'s
 * `useWizardForm`. The step index is local state; advancing runs
 * validate-before-advance through the caller's `validateStep`.
 */

import {
  type ComputedRef,
  computed,
  type InjectionKey,
  inject,
  type MaybeRefOrGetter,
  provide,
  type Ref,
  ref,
  toValue,
} from "vue";

/** The headless wizard controller surface. */
export interface UseWizardFormResult {
  /** Zero-based index of the visible step. */
  currentStep: Readonly<Ref<number>>;
  /** Whether a further step exists after the current one. */
  hasNext: ComputedRef<boolean>;
  /** Whether a step exists before the current one. */
  hasPrev: ComputedRef<boolean>;
  /**
   * Validate the current step and advance only if it passes. Resolves `true`
   * when it advanced, `false` when validation blocked it or there is no next
   * step.
   */
  next(): Promise<boolean>;
  /** Move back one step; a no-op on the first step. */
  prev(): void;
  /** Jump to a step, clamped into `[0, stepCount - 1]`. */
  goToStep(index: number): void;
  /** Submit the whole form: collects values from every (mounted) step. */
  submit(): Promise<void>;
}

/**
 * Local step index plus validate-before-advance. `stepNames` is the ordered
 * list of step names (index i is step i); `validateStep` reports whether the
 * named step is valid.
 */
export function useWizardForm(
  stepNames: MaybeRefOrGetter<readonly string[]>,
  submit: () => Promise<void>,
  validateStep: (stepName: string) => Promise<boolean>,
): UseWizardFormResult {
  const currentStep = ref(0);
  const lastIndex = computed(() => Math.max(0, toValue(stepNames).length - 1));

  const clamp = (index: number): number =>
    Math.min(Math.max(index, 0), lastIndex.value);

  return {
    currentStep,
    hasNext: computed(() => currentStep.value < lastIndex.value),
    hasPrev: computed(() => currentStep.value > 0),
    goToStep(index) {
      currentStep.value = clamp(index);
    },
    prev() {
      currentStep.value = clamp(currentStep.value - 1);
    },
    async next() {
      const index = currentStep.value;
      if (index >= lastIndex.value) return false;
      const stepName = toValue(stepNames)[index];
      const valid = stepName === undefined || (await validateStep(stepName));
      if (!valid) return false;
      currentStep.value = clamp(currentStep.value + 1);
      return true;
    },
    submit,
  };
}

const WizardFormContextKey: InjectionKey<UseWizardFormResult> = Symbol(
  "chelone-wizard-form-context",
);
const ActiveWizardStepKey: InjectionKey<Readonly<Ref<string | undefined>>> =
  Symbol("chelone-wizard-form-active-step");

/** Provide the controller and the active step name (called by `<WizardForm>`). */
export function provideWizardForm(
  wizard: UseWizardFormResult,
  activeStep: Readonly<Ref<string | undefined>>,
): void {
  provide(WizardFormContextKey, wizard);
  provide(ActiveWizardStepKey, activeStep);
}

/** The ambient wizard controller; throws outside a `<WizardForm>`. */
export function useWizardFormContext(): UseWizardFormResult {
  const ctx = inject(WizardFormContextKey, null);
  if (!ctx) {
    throw new Error(
      "useWizardFormContext: no <WizardForm> found above this component.",
    );
  }
  return ctx;
}

/** The active step name, for `<WizardFormStep>` to show or hide itself. */
export function useActiveWizardStep(): Readonly<Ref<string | undefined>> {
  return inject(ActiveWizardStepKey, undefined) ?? ref(undefined);
}
