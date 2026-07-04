import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLocaleState } from "../../../compat-hooks";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useResourceContext } from "../../../resource";
import type { InputProps } from "../input-props";

/**
 * Locale-aware money input.
 *
 * Stores either a plain `number` (single-currency mode) or a composite
 * `{ amount: number, currency: string }` (multi-currency mode). The currency
 * symbol and step precision are formatted with the `displayLocale` prop, or the
 * app locale from chelone's `useLocaleState()` when omitted.
 *
 * @example
 * import { Edit, SimpleForm, CurrencyInput } from '@chelone/react';
 *
 * const OrderEdit = () => (
 *   <Edit>
 *     <SimpleForm>
 *       <CurrencyInput source="total" currency="USD" />
 *     </SimpleForm>
 *   </Edit>
 * );
 */
function CurrencyInput(props: CurrencyInputProps) {
  const {
    label,
    source,
    className,
    resource: resourceProp,
    helperText,
    currency,
    currencies,
    displayLocale,
    storeAsMinorUnits = false,
    disabled,
    validate,
    isRequired: isRequiredProp,
    id: idProp,
    defaultValue,
    format,
    parse,
    // Strip the form/DOM handler seams so they don't reach `useInput` (chained
    // there) nor the DOM spread twice.
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
  const [appLocale] = useLocaleState();
  const locale = displayLocale ?? appLocale;

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

  const isComposite = !!currencies;
  const composite = isComposite
    ? (field.value as { amount: number; currency: string } | null)
    : null;
  const fixedAmount = isComposite
    ? composite?.amount
    : (field.value as number | null);
  const currentCurrency = isComposite ? composite?.currency : currency;

  const majorAmount =
    fixedAmount != null
      ? storeAsMinorUnits
        ? fixedAmount / 100
        : fixedAmount
      : "";

  const [displayValue, setDisplayValue] = useState<string>(String(majorAmount));
  const hasFocus = useRef(false);

  useEffect(() => {
    if (!hasFocus.current) setDisplayValue(String(majorAmount));
  }, [majorAmount]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
    const parsed = e.target.valueAsNumber;
    const next = Number.isNaN(parsed)
      ? null
      : storeAsMinorUnits
        ? Math.round(parsed * 100)
        : parsed;
    if (isComposite) {
      field.onChange({
        amount: next ?? 0,
        currency: currentCurrency ?? currencies?.[0],
      });
    } else {
      field.onChange(next);
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isComposite) return;
    field.onChange({
      amount: composite?.amount ?? 0,
      currency: e.target.value,
    });
  };

  const currencySymbol = currentCurrency
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currentCurrency,
      })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value
    : "";

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
      <div className={cn("flex items-center gap-2", className)}>
        <span className="w-6 text-right text-muted-foreground text-sm">
          {currencySymbol}
        </span>
        <Input
          {...rest}
          type="number"
          value={displayValue}
          step={storeAsMinorUnits ? 0.01 : "any"}
          onChange={handleAmountChange}
          onFocus={() => {
            hasFocus.current = true;
          }}
          onBlur={() => {
            hasFocus.current = false;
            field.onBlur();
          }}
          disabled={disabled}
          id={id}
          aria-invalid={invalid || undefined}
        />
        {isComposite && (
          <select
            data-currency-select
            value={currentCurrency ?? currencies?.[0]}
            onChange={handleCurrencyChange}
            disabled={disabled}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            {currencies?.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

interface CurrencyInputProps
  extends InputProps,
    Omit<
      React.ComponentProps<"input">,
      "defaultValue" | "onBlur" | "onChange" | "type" | "step"
    > {
  /** ISO-4217 currency code when storage is a plain number. */
  currency?: string;
  /** Provide to enable currency selection; stores composite { amount, currency }. */
  currencies?: readonly string[];
  /** Override the user's app locale for formatting symbol/step. */
  displayLocale?: string;
  /** Multiply displayed major units by 100 on write so storage is integer cents. */
  storeAsMinorUnits?: boolean;
}

export { CurrencyInput, type CurrencyInputProps };
