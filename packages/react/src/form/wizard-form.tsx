/**
 * WizardForm — a multi-step form (P6 W2-T4, plan §2 W2-T4 / decision D6d).
 *
 * A single form split into ordered steps. The step index is PURELY local state
 * (no router coupling — that's TabbedForm's job), and advancing runs
 * validate-before-advance: `next()` validates every field the current step owns
 * and only moves forward if all pass. Every step's inputs stay MOUNTED the whole
 * time (inactive steps are CSS-hidden, never unmounted) so cross-step values
 * survive navigation, a single submit collects the whole form, and every field
 * stays validatable regardless of which step is showing.
 *
 * Per-step membership + validity reuse the FormGroups primitive (W2-T1): each
 * `<WizardForm.Step name>` opens a `<FormGroupProvider name>` so its inputs
 * auto-register into that group, and `next()` reads the group's members to know
 * which fields to validate. form-core's FieldGroupApi/FormGroupApi are NOT used
 * (plan §0c-3).
 */

import {
  Children,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useCheloneFormContext } from "../form-context";
import type { UseFormOptions } from "../form-hooks";
import { FormScope } from "./form-scope";
import {
  FormGroupProvider,
  FormGroupsProvider,
  useFormGroups,
} from "./group-hooks";

/** The headless wizard controller surface. */
export interface UseWizardFormResult {
  /** Zero-based index of the visible step. */
  currentStep: number;
  /** Whether a further step exists after the current one. */
  hasNext: boolean;
  /** Whether a step exists before the current one. */
  hasPrev: boolean;
  /**
   * Validate the CURRENT step's fields and, only if all pass, advance to the
   * next step. Resolves `true` when it advanced, `false` when validation
   * blocked it or there is no next step. Never overruns the last step.
   */
  next(): Promise<boolean>;
  /** Move back one step; clamped at the first step (no-op there). */
  prev(): void;
  /** Jump to an arbitrary step index, clamped into `[0, stepCount - 1]`. */
  goToStep(index: number): void;
  /** Submit the whole form — collects values from every (mounted) step. */
  submit(): Promise<void>;
}

const WizardFormContext = createContext<UseWizardFormResult | null>(null);

/**
 * The ambient wizard controller (`currentStep`, `next`/`prev`/`goToStep`,
 * `submit`). Throws outside a `<WizardForm>`. Toolbar/step-nav buttons read
 * this; `<WizardForm.Step>` reads an internal active-step context instead.
 */
export function useWizardFormContext(): UseWizardFormResult {
  const ctx = useContext(WizardFormContext);
  if (!ctx) {
    throw new Error(
      "useWizardFormContext: no <WizardForm> found above this component.",
    );
  }
  return ctx;
}

/** Internal: the currently active step name, so a `<Step>` knows to show/hide. */
const ActiveStepContext = createContext<string | undefined>(undefined);

/**
 * The vanilla-ish wizard controller: local step index + validate-before-advance
 * over the FormGroups registry. `stepNames` is the ordered list of step names
 * (index i ↔ step i). `validateStep` runs the current step's field validators
 * and reports whether the step is valid.
 *
 * Membership comes from the ambient `<FormGroupsProvider>`: a step's fields
 * auto-register into a group named after the step, so `getMembers(stepName)`
 * yields exactly the fields to validate before leaving that step.
 */
export function useWizardForm(
  stepNames: readonly string[],
  submit: () => Promise<void>,
  validateStep: (stepName: string) => Promise<boolean>,
): UseWizardFormResult {
  const [currentStep, setCurrentStep] = useState(0);
  const lastIndex = Math.max(0, stepNames.length - 1);

  const clamp = useCallback(
    (index: number): number => Math.min(Math.max(index, 0), lastIndex),
    [lastIndex],
  );

  const goToStep = useCallback(
    (index: number): void => {
      setCurrentStep(clamp(index));
    },
    [clamp],
  );

  const prev = useCallback((): void => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }, []);

  const next = useCallback(async (): Promise<boolean> => {
    // Read the live index off the setter so a stale closure never advances the
    // wrong step (next() is awaited across act() boundaries in tests).
    let index = 0;
    setCurrentStep((step) => {
      index = step;
      return step;
    });
    if (index >= lastIndex) return false; // already last → nothing to advance to
    const stepName = stepNames[index];
    // A step with no name/members is trivially valid.
    const valid = stepName === undefined ? true : await validateStep(stepName);
    if (!valid) return false;
    setCurrentStep((step) => Math.min(step + 1, lastIndex));
    return true;
  }, [lastIndex, stepNames, validateStep]);

  return useMemo(
    () => ({
      currentStep,
      hasNext: currentStep < lastIndex,
      hasPrev: currentStep > 0,
      next,
      prev,
      goToStep,
      submit,
    }),
    [currentStep, lastIndex, next, prev, goToStep, submit],
  );
}

/** A step's identity marker — used to bucket `<WizardForm.Step>` children. */
const STEP_MARKER = "WizardFormStep";

interface StepMarker {
  chelName?: string;
}

export interface WizardFormStepProps {
  /** The step name — also its FormGroup name (its inputs register into it). */
  name: string;
  children: ReactNode;
}

/**
 * One step of a `<WizardForm>`. Its inputs register into a FormGroup named
 * `name` (so `next()` can validate exactly this step's fields), and the whole
 * step stays mounted — hidden (not unmounted) when it is not the active step,
 * so cross-step values and validation survive navigation.
 */
function WizardFormStep({ name, children }: WizardFormStepProps): ReactElement {
  const activeStep = useContext(ActiveStepContext);
  const active = activeStep === name;
  return (
    <div data-chelone-wizard-step={name} hidden={!active}>
      <FormGroupProvider name={name}>{children}</FormGroupProvider>
    </div>
  );
}
(WizardFormStep as StepMarker).chelName = STEP_MARKER;

/** Extract the ordered step names from `<WizardForm.Step>` children. */
function collectStepNames(children: ReactNode): string[] {
  const names: string[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    if ((child.type as StepMarker | undefined)?.chelName === STEP_MARKER) {
      const { name } = child.props as WizardFormStepProps;
      names.push(name);
    }
  }
  return names;
}

export interface WizardFormProps<TFormData> extends UseFormOptions<TFormData> {
  /** `<WizardForm.Step>` elements (and any non-step chrome — toolbars, etc.). */
  children: ReactNode;
}

interface WizardFormComponent {
  <TFormData>(props: WizardFormProps<TFormData>): ReactElement;
  /** The step slot: `<WizardForm.Step name="...">`. */
  Step: typeof WizardFormStep;
}

/**
 * A multi-step form. Provide `<WizardForm.Step name>` children (in order) plus
 * any step-nav chrome; a single `save` (via {@link UseFormOptions}) submits the
 * whole form. Inside a view that provides a form (`<Edit>`) it drives that form
 * and ignores the form options; standalone it builds its own. Wires the
 * FormGroups registry, drives the local
 * step index, and CSS-hides inactive steps so every field stays mounted.
 */
function WizardFormImpl<TFormData>({
  children,
  ...formOptions
}: WizardFormProps<TFormData>): ReactElement {
  // Step names are structural (children order); recompute only when they change.
  const stepNames = useMemo(() => collectStepNames(children), [children]);
  return (
    <FormScope<TFormData> options={formOptions}>
      {(submit) => (
        <FormGroupsProvider>
          <WizardShell stepNames={stepNames} submit={submit}>
            {children}
          </WizardShell>
        </FormGroupsProvider>
      )}
    </FormScope>
  );
}

interface WizardShellProps {
  stepNames: readonly string[];
  submit: () => Promise<void>;
  children: ReactNode;
}

/**
 * The inner shell — inside `<FormGroupsProvider>` so it can read step members.
 * Builds `validateStep` from the ambient form + group registry, runs the
 * wizard controller, and provides both the public wizard context and the
 * active-step context that `<WizardForm.Step>` reads.
 */
function WizardShell({ stepNames, submit, children }: WizardShellProps) {
  const { form } = useCheloneFormContext();
  const groups = useFormGroups();

  const validateStep = useCallback(
    async (stepName: string): Promise<boolean> => {
      const members = groups.getMembers(stepName);
      if (members.length === 0) return true; // no fields → trivially valid
      // Force-validate every member on the submit cause (form-core marks the
      // field touched then runs its validators — sync or async).
      await Promise.all(
        members.map((source) =>
          Promise.resolve(form.validateField(source, "submit")),
        ),
      );
      // Read the authoritative per-field validity the badge also aggregates.
      const fieldMeta = form.store.state.fieldMeta as Record<
        string,
        { isValid: boolean } | undefined
      >;
      return members.every((source) => fieldMeta[source]?.isValid !== false);
    },
    [form, groups],
  );

  const wizard = useWizardForm(stepNames, submit, validateStep);
  const activeStep = stepNames[wizard.currentStep];

  return (
    <WizardFormContext.Provider value={wizard}>
      <ActiveStepContext.Provider value={activeStep}>
        {children}
      </ActiveStepContext.Provider>
    </WizardFormContext.Provider>
  );
}

export const WizardForm = WizardFormImpl as WizardFormComponent;
WizardForm.Step = WizardFormStep;
