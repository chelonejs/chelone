import {
  type DateInputValue,
  formatDate,
  type SourceProp,
  type SourceValue,
  toDateInputValue,
  toTextValue,
} from "@chelone/core";
import * as React from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useResourceContext } from "../../../resource";
import { sanitizeInputRestProps } from "../../../util/sanitize-input-rest-props";
import { useEvent } from "../../../util/use-event";
import type { InputProps } from "../input-props";

/**
 * Date picker input for editing date values in "YYYY-MM-DD" format.
 *
 * Use `<DateInput>` for publication dates, deadlines, or birthdays. Renders a
 * native browser date picker. Accepts ISO strings, `Date` objects, or
 * timestamps and normalizes them to a bare date string.
 *
 * ## chelone rewrite (RHF → useInput)
 * shadmin drove the "not really controlled" pattern (type a partial date, tab
 * away, come back) through react-hook-form's `field.ref` + `useForkRef`.
 * chelone's `useInput` `field` has NO `ref`, so a plain local `useRef` attaches
 * straight to the `<Input>`; everything else (the `initialDefaultValueRef` +
 * `inputKey` remount + `wasLastChangedByInput` external-sync effect) ports
 * unchanged, now reading the chelone form value off `field.value`.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date input type="date"}
 *
 * @example
 * import { Edit, DateInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <DateInput source="published_at" />
 *   </Edit>
 * );
 */
function DateInput(props: DateInputProps) {
  const {
    className,
    inputClassName,
    defaultValue,
    format = formatDate,
    label,
    source,
    helperText,
    onChange,
    onFocus,
    validate,
    disabled,
    readOnly,
    parse,
    resource: _resource,
    ...rest
  } = props;

  const resource = useResourceContext(props);

  // `disabled`/`readOnly`/`resource` are NOT `useInput` keys — `resource`
  // resolves the label, disabled/readOnly gate the DOM `<Input>` below.
  const { field, fieldState, id, isRequired } = useInput({
    defaultValue,
    source,
    validate,
    format: (raw) => format(toDateInputValue(raw)),
    parse: parse && ((input) => parse(toTextValue(input))),
  });

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const localInputRef = React.useRef<HTMLInputElement | null>(null);
  // DateInput is not really controlled: users can type a partial date, tab to
  // another input, and come back to finish it. This ref holds the value passed
  // to the input's `defaultValue` so the DOM keeps the partial entry.
  const initialDefaultValueRef = React.useRef(field.value);
  // `defaultValue` changing won't remount the DOM input, so force it via `key`.
  const [inputKey, setInputKey] = React.useState(1);
  // Tracks whether the last form-value change originated from this input.
  const wasLastChangedByInput = React.useRef(false);

  // Stay in sync when the form value changes from OUTSIDE the input (e.g. a
  // form reset / setValue). Ignore changes this input itself just made.
  React.useEffect(() => {
    if (wasLastChangedByInput.current) {
      wasLastChangedByInput.current = false;
      return;
    }

    const hasNewValueFromForm =
      localInputRef.current?.value !== field.value &&
      !(localInputRef.current?.value === "" && field.value == null);

    if (hasNewValueFromForm) {
      initialDefaultValueRef.current = field.value;
      setInputKey((r) => r + 1);
      wasLastChangedByInput.current = false;
    }
  }, [field.value]);

  const { onBlur: onBlurFromField } = field;
  const hasFocus = React.useRef(false);

  // Update the form value while the user types, but only for a valid date.
  const handleChange = useEvent(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      if (
        typeof event.target === "undefined" ||
        typeof event.target.value === "undefined"
      ) {
        return;
      }
      const target = event.target;
      const newValue = target.value;
      const isNewValueValid =
        newValue === "" ||
        (target.valueAsDate != null &&
          !Number.isNaN(new Date(target.valueAsDate).getTime()));

      if (newValue !== "" && newValue != null && isNewValueValid) {
        field.onChange(newValue);
        wasLastChangedByInput.current = true;
      }
    },
  );

  const handleFocus = useEvent((event: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(event);
    hasFocus.current = true;
  });

  const handleBlur = useEvent(() => {
    hasFocus.current = false;

    if (!localInputRef.current) {
      return;
    }

    const newValue = localInputRef.current.value;
    // Re-check on blur so an emptied input actually clears the form value
    // (the change handler skips "" to avoid clobbering a partial entry).
    const isNewValueValid =
      newValue === "" ||
      (localInputRef.current.valueAsDate != null &&
        !Number.isNaN(new Date(localInputRef.current.valueAsDate).getTime()));

    if (isNewValueValid && field.value !== newValue) {
      field.onChange(newValue ?? "");
    }

    onBlurFromField?.();
  });

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
        ref={localInputRef}
        name={field.name}
        defaultValue={
          format(toDateInputValue(initialDefaultValueRef.current)) ?? ""
        }
        key={inputKey}
        type="date"
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "ra-input",
          `ra-input-${source}`,
          "scheme-light dark:scheme-dark relative [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:opacity-100 appearance-none",
          inputClassName,
        )}
        disabled={disabled || readOnly}
        readOnly={readOnly}
        {...sanitizeInputRestProps(rest)}
        id={id}
        aria-invalid={invalid || undefined}
      />
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

type DateInputProps<
  // type-escape: context: the no-record sentinel `SourcePath` and `SourceValue` test for
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> = Omit<InputProps<TRecord, TPath>, "format" | "parse"> & {
  /** Read transform: the stored value, as a date input holds it, to the `YYYY-MM-DD` string. */
  format?: (value: DateInputValue) => string | null;
  /** Write transform: the string the DOM input holds to the stored value. */
  parse?: (value: string) => SourceValue<TRecord, TPath>;
  inputClassName?: string;
} & Omit<React.ComponentProps<"input">, "label" | "defaultValue" | "type">;

export { DateInput, type DateInputProps };
