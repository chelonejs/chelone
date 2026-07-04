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
 * import { Edit, SimpleForm, NumberInput, TextInput } from '@/components/admin';
 *
 * const ProductEdit = () => (
 *   <Edit>
 *     <SimpleForm>
 *       <TextInput source="name" />
 *       <NumberInput source="price" step={0.01} min={0} />
 *       <NumberInput source="quantity" min={0} />
 *     </SimpleForm>
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

  const { id, field, fieldState, isRequired } = useInput({
    ...rest,
    defaultValue,
    source,
    validate,
    format,
    parse,
  });

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    // Use `valueAsNumber` for accurate float parsing (handles locale,
    // exponents, etc.) but fall back to the string when the input is
    // empty or otherwise not parseable as a number.
    const numericValue = event.target.valueAsNumber;
    const numberValue = parse(
      Number.isNaN(numericValue) ? rawValue : numericValue,
    );

    setValue(rawValue);
    // Write `null` (not 0) on empty so required validation still triggers
    // and we don't silently corrupt the record with zeros.
    field.onChange(numberValue);
    onChangeProp?.(event);
  };

  const [value, setValue] = useState<string | undefined>(
    field.value?.toString() ?? "",
  );

  const hasFocus = React.useRef(false);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
    hasFocus.current = true;
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    field.onBlur?.();
    onBlurProp?.(event);
    hasFocus.current = false;
    setValue(field.value?.toString() ?? "");
  };

  useEffect(() => {
    if (!hasFocus.current) {
      setValue(field.value?.toString() ?? "");
    }
  }, [field.value]);

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

interface NumberInputProps
  extends InputProps,
    Omit<
      React.ComponentProps<"input">,
      "defaultValue" | "onBlur" | "onChange" | "type"
    > {
  /**
   * Parse the raw input into a number (or `null` on empty/unparseable). The
   * param is `unknown` for chelone `useInput` parity — the handler feeds it a
   * `string | number`, and a custom parse may narrow.
   */
  parse?: (value: unknown) => number | null;
}

const defaultFormat = (value: unknown) =>
  value == null || Number.isNaN(value) ? "" : String(value);

const convertStringToNumber = (value: unknown): number | null => {
  if (value == null || value === "") {
    return null;
  }
  const float = typeof value === "number" ? value : parseFloat(String(value));

  return Number.isNaN(float) ? null : float;
};

export { NumberInput, type NumberInputProps };
