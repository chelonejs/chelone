/**
 * `SourceInputProps` — the four props every source-bound input carries: the
 * field path, the label override, the `defaultValue` typed as the value sitting
 * at `source`, and the validators. The Vue counterpart of the `source` /
 * `defaultValue` / `validate` slice of `@chelone/react`'s `InputProps`; inputs
 * used to redeclare them one by one, and several had drifted to `unknown`.
 */

import type {
  LooseRecord,
  SourceProp,
  SourceValue,
  Validator,
} from "@chelone/core";

export interface SourceInputProps<
  TRecord = LooseRecord,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> {
  /** The field path (dot/bracket), relative to the ambient source scope. */
  source: TPath;
  /** Explicit label, or `false` to hide it. Absent → humanized `source`. */
  label?: string | false;
  /** Input-level default (seeds only into a hole), typed as the value at `source`. */
  defaultValue?: NoInfer<SourceValue<TRecord, TPath>>;
  /** ra-contract validators — composed, first error wins. */
  validate?: Validator | readonly Validator[];
}
