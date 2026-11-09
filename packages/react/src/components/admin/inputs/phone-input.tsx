import {
  AsYouType,
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
} from "libphonenumber-js";
import type * as React from "react";
import { useEffect, useState } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useResourceContext } from "../../../resource";
import type { InputProps } from "../input-props";

/**
 * Phone input that stores E.164 (`+14155552671`) and renders a country
 * selector plus a national-format text input.
 *
 * @example
 * import { Edit, PhoneInput } from '@chelone/react';
 *
 * const CustomerEdit = () => (
 *   <Edit>
 *     <PhoneInput source="phone" defaultCountry="US" />
 *   </Edit>
 * );
 */
function PhoneInput(props: PhoneInputProps) {
  const {
    label,
    source,
    className,
    resource: resourceProp,
    helperText,
    defaultCountry = "US",
    allowedCountries,
    disabled,
    validate,
    isRequired: isRequiredProp,
    id: idProp,
    defaultValue,
    format,
    parse,
    onChange: _onChange,
    onBlur: _onBlur,
    name: _name,
    readOnly: _readOnly,
    ...rest
  } = props;
  void _onChange;
  void _onBlur;
  void _name;
  void _readOnly;
  const resource = useResourceContext({ resource: resourceProp });

  const { id, field, fieldState, isRequired } = useInput({
    source,
    validate,
    isRequired: isRequiredProp,
    id: idProp,
    defaultValue,
    format,
    parse,
  });

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const countries = allowedCountries ?? getCountries();

  const initial = inferCountry(String(field.value ?? ""), defaultCountry);
  const [country, setCountry] = useState<CountryCode>(initial);
  const [display, setDisplay] = useState<string>(
    formatNational(String(field.value ?? ""), country),
  );

  useEffect(() => {
    const c = inferCountry(String(field.value ?? ""), defaultCountry);
    setCountry(c);
    setDisplay(formatNational(String(field.value ?? ""), c));
  }, [field.value, defaultCountry]);

  const writeBack = (nationalText: string, cc: CountryCode) => {
    setDisplay(nationalText);
    try {
      const parsed = parsePhoneNumber(nationalText, cc);
      field.onChange(parsed.number);
    } catch {
      field.onChange(nationalText);
    }
  };

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
      <div className={cn("flex items-center gap-2", className)} {...rest}>
        <select
          data-country-select
          aria-label="Country"
          value={country}
          onChange={(e) => {
            const cc = countries.find((c) => c === e.target.value);
            if (cc === undefined) return;
            setCountry(cc);
            writeBack(display, cc);
          }}
          disabled={disabled}
          className="h-9 rounded-md border border-input bg-background px-2 py-1 text-sm"
        >
          {countries.map((c) => (
            <option key={c} value={c}>
              {c} +{getCountryCallingCode(c)}
            </option>
          ))}
        </select>
        <Input
          type="tel"
          value={display}
          disabled={disabled}
          onChange={(e) => {
            const formatter = new AsYouType(country);
            const formatted = formatter.input(e.target.value);
            writeBack(formatted, country);
          }}
          onBlur={field.onBlur}
          className="flex-1"
          id={id}
          aria-invalid={invalid || undefined}
        />
      </div>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

function inferCountry(value: string, fallback: CountryCode): CountryCode {
  try {
    const p = parsePhoneNumber(value);
    if (p.country) return p.country;
  } catch {
    /* ignore */
  }
  return fallback;
}

function formatNational(value: string, country: CountryCode): string {
  try {
    return parsePhoneNumber(value, country).formatNational();
  } catch {
    return value;
  }
}

interface PhoneInputProps
  extends InputProps,
    Omit<React.ComponentProps<"div">, "defaultValue" | "onBlur" | "onChange"> {
  defaultCountry?: CountryCode;
  allowedCountries?: readonly CountryCode[];
  disabled?: boolean;
}

export { PhoneInput, type PhoneInputProps };
