/**
 * Shared prop shapes for the choice inputs (select / select-array / autocomplete
 * / autocomplete-array / checkbox-group / radio-button-group). Mirrors the
 * `ChoicesProps` + `InputProps` surface each `@chelone/react` twin composes,
 * collapsed to the fields the Vue vertical wires. `source` is OPTIONAL: a choice
 * input nested under a reference wrapper inherits `source` from the ambient
 * choices context; standalone, it must be provided (each input throws otherwise).
 */

import type { SourceProp, Validator } from "@chelone/core";
import type { ChoiceRecord, OptionText } from "../../../choices/use-choices";

/** The choice-accessor + form-binding props every choice input accepts. */
export interface ChoiceInputBaseProps {
  /** The FK/field path. Optional under a reference wrapper (inherited from context). */
  source?: SourceProp | undefined;
  /** Inline choices (`{ id, name }[]` or `string[]`). Omitted under a reference wrapper. */
  choices?: readonly (string | ChoiceRecord)[];
  /** The display path (dotted) or a formatter over the whole choice. Default `name`. */
  optionText?: OptionText;
  /** The value path. Default `id`. */
  optionValue?: string;
  /** The disabled-flag path. Default `disabled`. */
  disableValue?: string;
  /** Translate a string-path label through the catalog. Default `!isFromReference`. */
  translateChoice?: boolean;
  /** Explicit label, or `false` to hide it. Absent → humanized `source`. */
  label?: string | false;
  /** Helper text under the control. */
  helperText?: string;
  /** Input-level default value (seeds only into a hole). */
  defaultValue?: unknown;
  /** ra-contract validators — composed, first error wins. */
  validate?: Validator | readonly Validator[];
  /** Disables the control. */
  disabled?: boolean;
  /** Renders the control read-only (non-interactive). */
  readonly?: boolean;
  /** Root element class passthrough. */
  class?: string;
}
