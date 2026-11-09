import type {
  SourcePath,
  SourceProp,
  SourceTransformValue,
  SourceValue,
  TranslatableMessage,
  Validator,
} from "@chelone/core";
import type { ReactNode } from "react";
import type { ChoiceRecord, OptionText } from "../../choices-hooks";

/**
 * Chelone-native `InputProps` — the shared prop contract every admin input
 * component accepts. This is the rebridge of ra-core's `InputProps` (which
 * shadmin imported from `shadmin-core`): the RHF-derived slots
 * (`UseControllerProps`, `ControllerRenderProps`) are dropped, and the
 * remaining presentational + wiring props are typed against chelone's own
 * form-core (`Validator`, `TranslatableMessage`, the `format`/`parse`
 * transforms `useInput` consumes) instead of react-hook-form.
 *
 * The shape stays a superset of {@link import("../../form-hooks").UseInputOptions}
 * so spreading `{...props}` into `useInput(props)` typechecks: `source`,
 * `isRequired`, `id`, `onChange`, `onBlur`, `defaultValue`, `format`, `parse`,
 * `validate`, and `schema` are the useInput-consumed keys; `label`, `resource`,
 * `helperText`, `disabled`, `readOnly`, `type`, and `name` are the
 * presentational keys the input components read directly.
 */
export interface InputProps<
  // type-escape: context: the no-record sentinel `SourcePath` and `SourceValue` test for
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> {
  /** The field path RELATIVE to the ambient source scope. */
  source: TPath;
  /**
   * The input label. A string is translated; a ReactNode renders as-is;
   * `false` (or `""`) renders no label.
   */
  label?: ReactNode | false;
  /** Override the ambient resource (used to resolve the default label key). */
  resource?: string;
  /** Helper text rendered below the input; a string is translated. */
  helperText?: ReactNode | false;
  /** Explicit element id; a generated `useId` value is used otherwise. */
  id?: string;
  /** Forces the required marker; ORed with `required()` detection on `validate`. */
  isRequired?: boolean;
  /** The DOM input `type` (text inputs default to `"text"`). */
  type?: string;
  /** ra-contract validators — composed, first error wins. */
  validate?: Validator | readonly Validator[];
  /**
   * Read transform (raw form value → input value). Receives the value at
   * `source`, plus the hole an untouched field leaves (a create form with no
   * `defaultValue` reads `undefined`); `unknown` without a record.
   */
  format?: (
    value: NoInfer<SourceTransformValue<TRecord, TPath>> | null | undefined,
  ) => unknown;
  /**
   * Write transform (input value → stored value). Must return the value at
   * `source`; `unknown` without a record.
   */
  parse?: (value: unknown) => NoInfer<SourceTransformValue<TRecord, TPath>>;
  /**
   * Input-level default, ra precedence (seeds only into an untouched hole).
   * Typed as the value at `source`; `unknown` without a record.
   */
  defaultValue?: NoInfer<SourceValue<TRecord, TPath>>;
  /** Native disabled state. */
  disabled?: boolean;
  /** Native read-only state. */
  readOnly?: boolean;
  /** Legacy field-name alias (ra parity); the wiring uses `source`. */
  name?: string;
  /**
   * As a `<FilterForm>`/`<FilterButton>` filter: always shown, never in the
   * add-filter menu. Read off the element by the filter layer, never by the input.
   */
  alwaysOn?: boolean;
  /** Chained AFTER the parsed value is written to the form. */
  onChange?: (eventOrValue?: unknown) => void;
  /** Chained AFTER the blur is recorded. */
  onBlur?: (event?: unknown) => void;
}

/** The displayable field-error union chelone `fieldState.error` carries. */
export type InputFieldError = string | TranslatableMessage | undefined;

/**
 * The `format` of an input that cannot name the value at its own `source`, so
 * it hands `useInput` the untyped read transform:
 *
 * - a choice input (`<AutocompleteInput>`, `<CheckboxGroupInput>`,
 *   `<SelectArrayInput>`, `<DatagridInput>`) resolves `source` from the choices
 *   context inside a reference wrapper, where it is a plain string;
 * - an editor input (`<MdxInput>`, `<MonacoJsonInput>`) supplies its own
 *   default transform over the text it edits.
 *
 * Their `parse` keeps the source-typed return {@link InputProps} declares: a
 * return type travels into the binding as-is, only a parameter type is checked
 * against the value the binding reads.
 */
export interface LooseFormatProps {
  format?: (value: unknown) => unknown; // type-escape: context: the resolved source names no path of a record
}

/**
 * The choice keys the inline-`choices` inputs share (ra's `ChoicesProps`), the
 * React twin of Vue's `ChoiceInputBaseProps` choice keys. `TChoice` is inferred
 * from `choices`, which is what makes `optionText`, `optionValue` and
 * `disableValue` paths of the choices the caller actually passed; under a
 * reference wrapper there are no choices and `TChoice` stays the loose
 * `ChoiceRecord`, where every path is a plain `string`.
 */
export interface ChoicesProps<TChoice extends ChoiceRecord = ChoiceRecord> {
  /** Inline choices (`{ id, name }[]` or `string[]`). Omitted under a reference wrapper. */
  choices?: readonly (string | TChoice)[];
  /** The display path (dot/bracket) or a formatter over the whole choice. Default `name`. */
  optionText?: OptionText<TChoice>;
  /** The value path. Default `id`. */
  optionValue?: SourcePath<TChoice>;
  /** The disabled-flag path. Default `disabled`. */
  disableValue?: SourcePath<TChoice>;
  /** Translate a string-path label. */
  translateChoice?: boolean;
}
