import {
  type DateInputValue,
  formatTime,
  isValidTime,
  parseTimeToDate,
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
 * Time picker for editing time-of-day values in "HH:mm" format.
 *
 * Use `<TimeInput>` for opening hours, alarms, or scheduling slots. Renders a
 * native browser time picker; formats an incoming "HH:mm" string or `Date` to
 * the display value and — by the default `parse` — returns a `Date` at today's
 * date with the entered time (pass a custom `parse` to store a raw string).
 *
 * ## chelone rewrite (RHF → useInput)
 * Same as `<DateInput>`: the uncontrolled "type-then-leave" pattern rode on
 * RHF's `field.ref` + `useForkRef`; chelone's `field` has no `ref`, so a plain
 * local `useRef` attaches directly to the `<Input>`. The
 * `initialDefaultValueRef` + `inputKey` remount + `wasLastChangedByInput`
 * external-sync effect port unchanged.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/time input type="time"}
 *
 * @example
 * import { Edit, TimeInput } from '@/components/admin';
 *
 * const EventEdit = () => (
 *   <Edit>
 *     <TimeInput source="opens_at" />
 *   </Edit>
 * );
 */
function TimeInput(props: TimeInputProps) {
  const {
    className,
    inputClassName,
    defaultValue,
    format = formatTime,
    parse = parseTimeToDate,
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
    format: (raw) => format(toDateInputValue(raw)),
    parse: (input) => parse(toTextValue(input)),
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
      // "HH:mm" and "HH:mm:ss" are both valid time strings.
      const isNewValueValid = isValidTime(newValue);

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
    const isNewValueValid = isValidTime(newValue);

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
        defaultValue={format(toDateInputValue(initialDefaultValueRef.current))}
        key={inputKey}
        type="time"
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

type TimeInputProps<
  // type-escape: context: the no-record sentinel `SourcePath` and `SourceValue` test for
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> = Omit<InputProps<TRecord, TPath>, "format" | "parse"> & {
  /** Read transform: the stored value, as a date input holds it, to the input's display string. */
  format?: (value: DateInputValue) => string;
  /** Write transform: the string the DOM input holds to the stored value. */
  parse?: (value: string) => SourceValue<TRecord, TPath>;
  inputClassName?: string;
} & Omit<React.ComponentProps<"input">, "defaultValue" | "type">;

export { TimeInput, type TimeInputProps };
