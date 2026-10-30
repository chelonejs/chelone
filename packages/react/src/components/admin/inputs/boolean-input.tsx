import type React from "react";
import type { ComponentProps } from "react";
import { useCallback } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useResourceContext } from "../../../resource";
import type { InputProps } from "../input-props";

/**
 * Toggle switch for boolean (true/false) values.
 *
 * Use `<BooleanInput>` for binary settings like "is published", "is active", or
 * feature flags. Wraps the shadcn `<Switch>` primitive. Note: this input does
 * NOT support `null` — use `<NullableBooleanInput>` for tri-state booleans.
 *
 * @example
 * import { Edit, BooleanInput, TextInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <TextInput source="title" />
 *     <BooleanInput source="is_published" />
 *   </Edit>
 * );
 */
function BooleanInput(props: BooleanInputProps) {
  const {
    className,
    defaultValue = false,
    format,
    label,
    helperText,
    onBlur,
    onChange,
    onFocus,
    readOnly,
    disabled,
    parse,
    resource: resourceProp,
    source,
    validate,
    options,
  } = props;
  const resource = useResourceContext({ resource: resourceProp });

  // NOTE (chelone divergence from shadmin): ra-core's `useInput` took a
  // `type: "checkbox"` flag to switch RHF's event extraction to `target.checked`.
  // chelone's `useInput` extracts `checked` automatically for checkbox events
  // (see `extractEventValue`), and here `handleChange` passes a raw boolean to
  // `field.onChange` anyway — so the flag is neither accepted nor needed.
  // `resource`/`disabled`/`readOnly` are NOT `useInput` keys (they are
  // presentational — `resource` resolves the label, disabled/readOnly gate the
  // DOM control below); only the wiring keys are threaded into `useInput`.
  const { id, field, fieldState, isRequired } = useInput({
    defaultValue,
    format,
    parse,
    source,
    onBlur,
    // The user `onChange(boolean)` is chained inside `handleChange` (which
    // calls `field.onChange(checked)`), so it is NOT passed to `useInput` here.
    validate,
  });

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const handleChange = useCallback(
    (checked: boolean) => {
      field.onChange(checked);
      // Mark the field touched so validation surfaces on interaction.
      field.onBlur();
      // Chain the user's `onChange(boolean)`. Kept out of `useInput` (whose
      // `onChange` is `(eventOrValue?: unknown) => void`) so the boolean arg is
      // exact and it fires exactly once.
      onChange?.(checked);
    },
    [field, onChange],
  );

  return (
    <Field className={className} data-invalid={invalid || undefined}>
      <div className="flex items-center gap-2">
        <Switch
          id={id}
          aria-invalid={invalid || undefined}
          checked={Boolean(field.value)}
          onFocus={onFocus}
          onCheckedChange={handleChange}
          disabled={disabled || readOnly}
          {...options}
        />
        <FieldLabel htmlFor={id}>
          <FieldLabelText
            label={label}
            source={source}
            resource={resource}
            isRequired={isRequired}
          />
        </FieldLabel>
      </div>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

interface BooleanInputProps
  extends Omit<InputProps, "onChange" | "onBlur" | "type"> {
  className?: string;
  /** ra precedence default; `false` when omitted (the switch starts off). */
  defaultValue?: boolean | null;
  /** Read transform (raw form value → boolean the switch reflects). */
  format?: (value: unknown) => unknown;
  /** Write transform (boolean → stored value). */
  parse?: (value: unknown) => unknown;
  onBlur?: (event?: unknown) => void;
  /** Chained AFTER the parsed boolean is written to the form. */
  onChange?: (value: boolean) => void;
  onFocus?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  /** Extra props forwarded to the underlying shadcn `<Switch>`. */
  options?: ComponentProps<typeof Switch>;
}

export { BooleanInput, type BooleanInputProps };
