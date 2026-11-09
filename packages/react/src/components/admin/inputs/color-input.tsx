import { type SourceProp, toTextValue } from "@chelone/core";
import type * as React from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { ColorPicker } from "@/components/ui/color-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useResourceContext } from "../../../resource";
import type { InputProps } from "../input-props";

/**
 * Color picker input. Stores a CSS color string (hex by default).
 *
 * Wraps the `<ColorPicker>` UI primitive — opens a popover with an oklch L×C
 * pad, hue / alpha strips, and a mode switcher. Pass `swatches` to render a row
 * of quick-set preset buttons next to the trigger, or `native` to use the
 * browser's `<input type="color">`.
 *
 * @example
 * import { Edit, ColorInput } from '@/components/admin';
 *
 * const BrandEdit = () => (
 *   <Edit>
 *     <ColorInput source="color" swatches={["#3b82f6", "#22c55e"]} />
 *   </Edit>
 * );
 */
function ColorInput(props: ColorInputProps) {
  const {
    label,
    source,
    className,
    resource: resourceProp,
    helperText,
    swatches,
    disabled,
    mode,
    native,
  } = props;
  const resource = useResourceContext({ resource: resourceProp });

  // Strip `onChange` / `onBlur` from the props passed to `useInput` so the
  // user's handlers aren't invoked twice (once by the `useInput` wiring and
  // once by our handlers below).
  const { onChange: _stripChange, onBlur: _stripBlur, ...sansHandlers } = props;
  void _stripChange;
  void _stripBlur;
  const { id, field, fieldState, isRequired } = useInput(sansHandlers);

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const value = toTextValue(field.value) || "#000000";

  return (
    <Field className={className} data-invalid={invalid || undefined}>
      {label !== false && (
        <FieldLabel htmlFor={id}>
          <FieldLabelText
            label={label}
            source={source}
            resource={resource}
            isRequired={isRequired}
          />
        </FieldLabel>
      )}
      <fieldset
        id={id}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        // `fieldset[disabled]` blocks all inner form controls (incl. the
        // picker trigger button + swatch buttons). The classes below add the
        // visual cue and prevent stray hover states.
        className={cn(
          "flex items-center gap-2 border-0 p-0",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <ColorPicker
          value={value}
          onChange={(next) => field.onChange(next)}
          mode={mode}
          native={native}
          aria-label="Pick a color"
        />
        {swatches?.map((s) => (
          <button
            key={s}
            type="button"
            data-color-swatch
            aria-label={`Select color ${s}`}
            onClick={() => field.onChange(s)}
            className={cn(
              "h-6 w-6 rounded border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              disabled && "cursor-not-allowed",
            )}
            style={{ backgroundColor: s }}
          />
        ))}
      </fieldset>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

interface ColorInputProps<
  // type-escape: context: the no-record sentinel `SourcePath` and `SourceValue` test for
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> extends InputProps<TRecord, TPath>,
    Omit<
      React.ComponentProps<"input">,
      "defaultValue" | "onBlur" | "onChange" | "type"
    > {
  /** Quick-set color buttons rendered next to the picker trigger. */
  swatches?: readonly string[];
  /**
   * Force the picker to output values in a specific mode.
   *
   * @see ColorPicker
   */
  mode?: React.ComponentProps<typeof ColorPicker>["mode"];
  /**
   * Replace the popover picker with the browser's native `<input type="color">`.
   *
   * @see ColorPicker
   */
  native?: boolean;
}

export { ColorInput, type ColorInputProps };
