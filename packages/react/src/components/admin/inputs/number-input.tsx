import type { SourceProp } from "@chelone/core";
import { toNumberValue } from "@chelone/core";
import * as React from "react";
import { useEffect, useState } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useResourceContext } from "../../../resource";
import type { InputProps } from "../input-props";

/**
 * Input component for numeric values (integers and floats) with parsing and
 * formatting support.
 *
 * Use `<NumberInput>` for prices, quantities, counts, or any numeric field.
 * Manages a local string state internally so users can type incomplete numbers
 * (e.g. '-' or '0.') before the value is parsed. Supports min/max constraints
 * and step increments. Writes `null` (not `0`) on empty so required validation
 * still triggers.
 *
 * @example
 * import { Edit, NumberInput, TextInput } from '@/components/admin';
 *
 * const ProductEdit = () => (
 *   <Edit>
 *     <TextInput source="name" />
 *     <NumberInput source="price" step={0.01} min={0} />
 *     <NumberInput source="quantity" min={0} />
 *   </Edit>
 * );
 */
function NumberInput(props: NumberInputProps) {
  const {
    label,
    source,
    className,
    resource: resourceProp,
    validate,
    format = defaultFormat,
    parse = convertStringToNumber,
    onFocus,
    onChange: onChangeProp,
    onBlur: onBlurProp,
    helperText,
    // `defaultValue` (InputProps) is typed `unknown` and must not reach the DOM
    // `<Input>` (which types it `string | number | …`); it is threaded into
    // `useInput` explicitly below instead of via the DOM `rest` spread.
    defaultValue,
    ...rest
  } = props;
  const resource = useResourceContext({ resource: resourceProp });

  // `format` and `parse` run here on the local string state, so the binding
  // keeps its defaults and `parse` runs once per edit.
  const { id, field, fieldState, isRequired } = useInput({
    ...rest,
    defaultValue,
    source,
    validate,
  });
  const display = format(toNumberValue(field.value));

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    const numberValue = parse(rawValue);

    setValue(rawValue);
    // Write `null` (not 0) on empty so required validation still triggers
    // and we don't silently corrupt the record with zeros.
    field.onChange(numberValue);
    onChangeProp?.(event);
  };

  const [value, setValue] = useState(display);

  const hasFocus = React.useRef(false);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
    hasFocus.current = true;
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    field.onBlur?.();
    onBlurProp?.(event);
    hasFocus.current = false;
    setValue(display);
  };

  useEffect(() => {
    if (!hasFocus.current) {
      setValue(display);
    }
  }, [display]);

  // Destructure `field` so the spread below doesn't reinstate the value /
  // onChange / onBlur we're handling manually. chelone's `field` has no `ref`.
  const {
    value: _fieldValue,
    onChange: _fieldOnChange,
    onBlur: _fieldOnBlur,
    ...fieldRest
  } = field;
  void _fieldValue;
  void _fieldOnChange;
  void _fieldOnBlur;

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
      <Input
        {...rest}
        {...fieldRest}
        id={id}
        type="number"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-invalid={invalid || undefined}
      />
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

interface NumberInputProps<
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> extends Omit<InputProps<TRecord, TPath>, "format" | "parse">,
    Omit<
      React.ComponentProps<"input">,
      "defaultValue" | "onBlur" | "onChange" | "type"
    > {
  /** Text the input shows for the stored number (`null` when empty). */
  format?: (value: number | null) => string;
  /** The number to store for the text the user typed (`null` when empty or unparseable). */
  parse?: (value: string) => number | null;
}

const defaultFormat = (value: number | null): string =>
  value === null ? "" : String(value);

const convertStringToNumber = (value: string | number): number | null => {
  if (value === "") {
    return null;
  }
  const float = typeof value === "number" ? value : parseFloat(value);

  return Number.isNaN(float) ? null : float;
};

export { NumberInput, type NumberInputProps };
