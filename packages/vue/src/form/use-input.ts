/**
 * `useInput` — the Vue input workhorse, the twin of `@chelone/react`'s `useInput`
 * (`form-hooks.ts`, ra's `useInput` rebridged onto form-core). It binds ONE field
 * to the ambient form (injected from `useForm`'s provider) through a vanilla
 * `FieldBinding`, and exposes the two-way binding + validation surface an input
 * SFC needs: `{ id, name, value, setValue, blur, error, touched, isRequired }`.
 *
 * The 4R lifecycle rides the binding's `subscribe`: {@link useSubscribable}
 * subscribes on `setup`, so the field mounts (seeds the guarded default,
 * registers with the form so submit-time / schema validation sees it, runs
 * onMount), and `onScopeDispose` unmounts on teardown. This is exactly the React
 * twin's commit-phase attach, mapped to Vue's effect scope.
 *
 * `error` is the first displayable field error — a `string | TranslatableMessage`
 * normalized by {@link firstFieldError} — rendered through i18n, never a raw
 * `error.root.message`. Schema issues (from the form's registry schema) and
 * server field errors (mapped onto the form's `onSubmit` channel) both surface
 * here once the field is registered.
 */

import type {
  CheloneFieldState,
  FieldBinding,
  SourcePath,
  TranslatableMessage,
  Validator,
} from "@chelone/core";
import { createFieldBinding, defaultFormat, isRequired } from "@chelone/core";
import { type ComputedRef, computed, useId } from "vue";
import { firstFieldError } from "./field-error";
import { useCheloneFormContext, useSourceScope } from "./form-context";
import { useRegisterFieldGroup } from "./form-groups";
import { useSubscribable } from "./subscribe-ref";

/** The erased form-data shape the ambient form carries. */
type UnknownFormValues = Record<string, unknown>;

export interface UseInputOptions<TRecord = UnknownFormValues> {
  /** The field path RELATIVE to the ambient source scope (iterator rows compose it). */
  source: SourcePath<TRecord>;
  /**
   * Input-level default (ra precedence): seeds ONLY into a hole (an untouched
   * field whose form value is `undefined`); an existing record value wins.
   */
  defaultValue?: unknown;
  /** ra-contract validators — composed, first error wins. */
  validate?: Validator | readonly Validator[];
  /** Read transform (raw form value → input value). Default `defaultFormat`. */
  format?: (value: unknown) => unknown;
  /** Write transform (input value → stored value). Default `defaultParse`. */
  parse?: (input: unknown) => unknown;
  /** Forces the required marker; ORed with `required()` detection on `validate`. */
  isRequired?: boolean;
  /** Explicit element id; a `useId` value is generated otherwise. */
  id?: string;
}

/** The reactive input surface — spread onto / bound into the input SFC. */
export interface UseInputReturn {
  /** Stable element id (for `<label for>` / `aria-describedby`). */
  id: string;
  /** The FINAL field path (source-scoped). */
  name: string;
  /** The input-facing value: `format(raw)` — `''` for nullish under the default. */
  value: ComputedRef<unknown>;
  /** Writes `parse(value)` to the field (marks touched+dirty, validates per mode). */
  setValue: (input: unknown) => void;
  /** Marks the field blurred and runs blur-cause validation. */
  blur: () => void;
  /** The first displayable field error, or `undefined` when valid. */
  error: ComputedRef<string | TranslatableMessage | undefined>;
  /** Whether the field has been touched. */
  touched: ComputedRef<boolean>;
  /** Whether a required validator is present (or `isRequired` was forced). */
  isRequired: boolean;
}

/**
 * Native-event value extraction (parity with the React twin): a DOM/synthetic
 * change event yields `target.checked` for checkboxes and `target.value`
 * otherwise; a raw value (v-model payload, a custom picker's value) passes
 * through untouched. Lets an SFC wire either `@input="setValue"` or
 * `@update:modelValue="setValue"` without a shim.
 */
function extractEventValue(input: unknown): unknown {
  if (typeof input === "object" && input !== null && "target" in input) {
    const { target } = input as { target: unknown };
    if (
      typeof target === "object" &&
      target !== null &&
      ("value" in target || "checked" in target)
    ) {
      const element = target as {
        type?: unknown;
        checked?: unknown;
        value?: unknown;
      };
      return element.type === "checkbox" ? element.checked : element.value;
    }
  }
  return input;
}

export function useInput<TRecord = UnknownFormValues>(
  options: UseInputOptions<TRecord>,
): UseInputReturn {
  const { form } = useCheloneFormContext();
  const scope = useSourceScope();
  const source = scope.getSource(options.source);
  const generatedId = useId();
  useRegisterFieldGroup(source);

  const binding: FieldBinding<UnknownFormValues> = createFieldBinding(form, {
    source,
    defaultValue: options.defaultValue,
    format: options.format,
    parse: options.parse,
    validate: options.validate,
  });

  // 4R: subscribing mounts the field (seed default + register + onMount) on
  // `setup`; `onScopeDispose` unmounts it on teardown.
  const state = useSubscribable<CheloneFieldState<UnknownFormValues>>(binding);
  const format = options.format ?? defaultFormat;

  return {
    id: options.id ?? generatedId,
    name: source,
    value: computed(() => format(state.value.value)),
    setValue: (input: unknown) => binding.setValue(extractEventValue(input)),
    blur: () => binding.blur(),
    error: computed(() => firstFieldError(state.value.meta.errorMap)),
    touched: computed(() => state.value.meta.isTouched),
    isRequired: options.isRequired === true || isRequired(options.validate),
  };
}
