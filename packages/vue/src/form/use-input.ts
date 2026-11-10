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
  SourcePath,
  SourceValue,
  TranslatableMessage,
  Validator,
} from "@chelone/core";
import { defaultFormat, extractEventValue, isRequired } from "@chelone/core";
import { type ComputedRef, computed, useId } from "vue";
import { firstFieldError } from "./field-error";
import { useCheloneFormContext, useSourceScope } from "./form-context";
import { useRegisterFieldGroup } from "./form-groups";
import { useSubscribable } from "./subscribe-ref";

export interface UseInputOptions<
  TRecord = unknown,
  TPath extends SourcePath<TRecord> = SourcePath<TRecord>,
  TInput = unknown,
> {
  /** The field path RELATIVE to the ambient source scope (iterator rows compose it). */
  source: TPath;
  /**
   * Input-level default (ra precedence): seeds ONLY into a hole (an untouched
   * field whose form value is `undefined`); an existing record value wins.
   * Typed as the value at `source` (`unknown` without a record).
   */
  defaultValue?: NoInfer<SourceValue<TRecord, TPath>>;
  /** ra-contract validators — composed, first error wins. */
  validate?: Validator | readonly Validator[];
  /**
   * Read transform (raw form value → input value). Default `defaultFormat`.
   * Receives the value at `source`, plus the holes an untouched or cleared
   * field leaves.
   */
  format?: (
    value: NoInfer<SourceValue<TRecord, TPath>> | null | undefined,
  ) => TInput;
  /** Write transform (input value → stored value). Default `defaultParse`. */
  parse?: (input: TInput) => NoInfer<SourceValue<TRecord, TPath>>;
  /** Forces the required marker; ORed with `required()` detection on `validate`. */
  isRequired?: boolean;
  /** Explicit element id; a `useId` value is generated otherwise. */
  id?: string;
}

/**
 * The reactive input surface — spread onto / bound into the input SFC.
 * `TInput` is what the input holds: the result of `format`.
 */
export interface UseInputReturn<TInput = unknown> {
  /** Stable element id (for `<label for>` / `aria-describedby`). */
  id: string;
  /** The FINAL field path (source-scoped). */
  name: string;
  /** The input-facing value: `format(raw)` — `''` for nullish under the default. */
  value: ComputedRef<TInput>;
  /**
   * Writes `parse(value)` to the field (marks touched+dirty, validates per
   * mode). Takes a change event or the value itself.
   */
  setValue: (input: Event | TInput) => void;
  /** Marks the field blurred and runs blur-cause validation. */
  blur: () => void;
  /** The first displayable field error, or `undefined` when valid. */
  error: ComputedRef<string | TranslatableMessage | undefined>;
  /** Whether the field has been touched. */
  touched: ComputedRef<boolean>;
  /** Whether a required validator is present (or `isRequired` was forced). */
  isRequired: boolean;
}

export function useInput<
  TRecord,
  TPath extends SourcePath<TRecord> = SourcePath<TRecord>,
  TInput = unknown,
>(options: UseInputOptions<TRecord, TPath, TInput>): UseInputReturn<TInput>;
export function useInput(options: UseInputOptions): UseInputReturn {
  const { form } = useCheloneFormContext();
  const scope = useSourceScope();
  const source = scope.getSource(options.source);
  const generatedId = useId();
  useRegisterFieldGroup(source);

  const binding = form.ambient.bindField({
    source,
    defaultValue: options.defaultValue,
    format: options.format,
    parse: options.parse,
    validate: options.validate,
  });

  // 4R: subscribing mounts the field (seed default + register + onMount) on
  // `setup`; `onScopeDispose` unmounts it on teardown.
  // type-escape: context: the ambient form names no record, so its field is record-free
  const state = useSubscribable<CheloneFieldState<unknown>>(binding);
  const format = options.format ?? defaultFormat;

  return {
    id: options.id ?? generatedId,
    name: source,
    value: computed(() => format(state.value.value)),
    // type-escape: dom: an event or the raw value, told apart by `extractEventValue`
    setValue: (input: unknown) => binding.setValue(extractEventValue(input)),
    blur: () => binding.blur(),
    error: computed(() => firstFieldError(state.value.meta.errorMap)),
    touched: computed(() => state.value.meta.isTouched),
    isRequired: options.isRequired === true || isRequired(options.validate),
  };
}
