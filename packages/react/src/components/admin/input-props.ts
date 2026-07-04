import type { TranslatableMessage, Validator } from "@chelone/core";
import type { ReactNode } from "react";

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
export interface InputProps<ValueType = unknown> {
  /** The field path RELATIVE to the ambient source scope. */
  source: string;
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
  /** Read transform (raw form value → input value). */
  format?: (value: ValueType) => unknown;
  /** Write transform (input value → stored value). */
  parse?: (value: unknown) => ValueType;
  /** Input-level default, ra precedence (seeds only into an untouched hole). */
  defaultValue?: unknown;
  /** Native disabled state. */
  disabled?: boolean;
  /** Native read-only state. */
  readOnly?: boolean;
  /** Legacy field-name alias (ra parity); the wiring uses `source`. */
  name?: string;
  /** Chained AFTER the parsed value is written to the form. */
  onChange?: (eventOrValue?: unknown) => void;
  /** Chained AFTER the blur is recorded. */
  onBlur?: (event?: unknown) => void;
}

/** The displayable field-error union chelone `fieldState.error` carries. */
export type InputFieldError = string | TranslatableMessage | undefined;
