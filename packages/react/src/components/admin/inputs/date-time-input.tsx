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
 * Date + time picker for editing datetime values.
 *
 * Use `<DateTimeInput>` for timestamps ("created at", scheduled events). Renders
 * a native browser `datetime-local` picker; formats an incoming ISO string,
 * `Date`, or timestamp to the local `yyyy-MM-ddThh:mm` display value and parses
 * the entered value back to an ISO 8601 string using the browser timezone.
 *
 * ## chelone rewrite (RHF → useInput)
 * Same as `<DateInput>`: shadmin's uncontrolled "type-then-leave" pattern rode
 * on RHF's `field.ref` + `useForkRef`; chelone's `field` has no `ref`, so a
 * plain local `useRef` attaches directly to the `<Input>`. The
 * `initialDefaultValueRef` + `inputKey` remount + `wasLastChangedByInput`
 * external-sync effect port unchanged, reading `field.value`.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local input type="datetime-local"}
 *
 * @example
 * import { Edit, SimpleForm, DateTimeInput } from '@/components/admin';
 *
 * const EventEdit = () => (
 *   <Edit>
 *     <SimpleForm>
 *       <DateTimeInput source="starts_at" />
 *     </SimpleForm>
 *   </Edit>
 * );
 */
function DateTimeInput(props: DateTimeInputProps) {
  const {
    className,
    inputClassName,
    defaultValue,
    format = formatDateTime,
    parse = convertDateStringToISO,
    label,
    helperText,
    onBlur,
    onChange,
    onFocus,
    source,
    resource: _resource,
    validate,
    disabled,
    readOnly,
    ...rest
  } = props;
  const resource = useResourceContext(props);

  // `resource`/`disabled`/`readOnly` are NOT `useInput` keys — `resource`
  // resolves the label, disabled/readOnly gate the DOM `<Input>` below.
  const { field, fieldState, id, isRequired } = useInput({
    defaultValue,
    onBlur,
    source,
    validate,
    format,
    parse,
  });

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const localInputRef = React.useRef<HTMLInputElement | null>(null);
  const initialDefaultValueRef = React.useRef(field.value);
  const [inputKey, setInputKey] = React.useState(1);
  const wasLastChangedByInput = React.useRef(false);

  // Stay in sync when the form value changes from OUTSIDE the input.
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
        newValue === "" || !Number.isNaN(new Date(target.value).getTime());

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
    const isNewValueValid =
      newValue === "" ||
      !Number.isNaN(new Date(localInputRef.current.value).getTime());

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
        defaultValue={format(initialDefaultValueRef.current) as string}
        key={inputKey}
        type="datetime-local"
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

type DateTimeInputProps = Omit<InputProps, "defaultValue"> & {
  defaultValue?: string | number | Date;
  inputClassName?: string;
} & Omit<React.ComponentProps<"input">, "defaultValue" | "type">;

const leftPad =
  (nb = 2) =>
  (value: number) =>
    ("0".repeat(nb) + value).slice(-nb);
const leftPad4 = leftPad(4);
const leftPad2 = leftPad(2);

/**
 * Convert a Date to a local "yyyy-MM-ddThh:mm" string for `datetime-local`.
 */
const convertDateToString = (value: Date) => {
  if (!(value instanceof Date) || Number.isNaN(value.getDate())) return "";
  const yyyy = leftPad4(value.getFullYear());
  const MM = leftPad2(value.getMonth() + 1);
  const dd = leftPad2(value.getDate());
  const hh = leftPad2(value.getHours());
  const mm = leftPad2(value.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

// yyyy-MM-ddThh:mm
const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Convert a value from the dataProvider (ISO string / `Date`) to the local
 * `datetime-local` display string. Empty → "" (keeps the input controlled).
 */
const formatDateTime = (value: unknown): string => {
  if (value == null || value === "") {
    return "";
  }
  if (value instanceof Date) {
    return convertDateToString(value);
  }
  if (typeof value === "string" && dateTimeRegex.test(value)) {
    return value;
  }
  return convertDateToString(new Date(value as string | number));
};

/**
 * Convert the local `datetime-local` string back to an ISO string (browser
 * timezone). Returns `null` for empty so a required validator still fires.
 */
const convertDateStringToISO = (value: unknown): string | null => {
  if (value == null || value === "") return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export { DateTimeInput, type DateTimeInputProps };
