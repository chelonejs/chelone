import { type LooseRecord, type SourceProp, toTextValue } from "@chelone/core";
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
import { parseIsoDuration } from "./duration-utils";

type Unit = "d" | "h" | "m" | "s";
const DEFAULT_UNITS: readonly Unit[] = ["d", "h", "m", "s"];
const UNIT_LABEL: Record<Unit, string> = {
  d: "days",
  h: "hours",
  m: "minutes",
  s: "seconds",
};

/** The per-unit box contents of a stored ISO-8601 duration. */
function seed(stored: string): Record<Unit, string> {
  const parsed = parseIsoDuration(stored) ?? {};
  return {
    d: parsed.days?.toString() ?? "",
    h: parsed.hours?.toString() ?? "",
    m: parsed.minutes?.toString() ?? "",
    s: parsed.seconds?.toString() ?? "",
  };
}

/**
 * Edits an ISO-8601 duration string via per-unit numeric inputs.
 *
 * @example
 * import { Edit, DurationInput } from '@chelone/react';
 *
 * const TaskEdit = () => (
 *   <Edit>
 *     <DurationInput source="duration" />
 *   </Edit>
 * );
 */
function DurationInput<
  TRecord = LooseRecord,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
>(props: DurationInputProps<TRecord, TPath>) {
  const {
    label,
    source,
    className,
    resource: resourceProp,
    helperText,
    units = DEFAULT_UNITS,
    disabled,
    ...inputProps
  } = props;
  const resource = useResourceContext({ resource: resourceProp });

  // The component's own generics go to `useInput` so `format` and `parse` are
  // typed by the value at `source`.
  const { id, field, fieldState, isRequired } = useInput<TRecord, TPath>({
    ...inputProps,
    source,
  });
  const {
    validate: _validate,
    isRequired: _isRequired,
    id: _id,
    defaultValue: _defaultValue,
    format: _format,
    parse: _parse,
    onChange: _onChange,
    onBlur: _onBlur,
    name: _name,
    readOnly: _readOnly,
    ...rest
  } = inputProps;

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const stored = toTextValue(field.value);
  const [values, setValues] = useState<Record<Unit, string>>(() =>
    seed(stored),
  );

  useEffect(() => {
    setValues(seed(stored));
  }, [stored]);

  const writeBack = (next: Record<Unit, string>) => {
    const dayPart = next.d ? `${+next.d}D` : "";
    const timeParts =
      (next.h ? `${+next.h}H` : "") +
      (next.m ? `${+next.m}M` : "") +
      (next.s ? `${+next.s}S` : "");
    const out =
      dayPart || timeParts
        ? `P${dayPart}${timeParts ? `T${timeParts}` : ""}`
        : "";
    field.onChange(out || null);
  };

  return (
    <Field className={className} data-invalid={invalid || undefined}>
      {label !== false && (
        <FieldLabel htmlFor={units.length > 0 ? `${id}-${units[0]}` : id}>
          <FieldLabelText
            label={label}
            source={source}
            resource={resource}
            isRequired={isRequired}
          />
        </FieldLabel>
      )}
      <div className={cn("flex items-end gap-2", className)} {...rest}>
        {units.map((u) => (
          <label
            key={u}
            htmlFor={`${id}-${u}`}
            className="flex flex-col items-center text-muted-foreground text-xs"
          >
            <Input
              type="number"
              min={0}
              disabled={disabled}
              value={values[u]}
              onChange={(e) => {
                const next = { ...values, [u]: e.target.value };
                setValues(next);
                writeBack(next);
              }}
              onBlur={field.onBlur}
              className="w-16 text-foreground"
              aria-label={UNIT_LABEL[u]}
              id={`${id}-${u}`}
              aria-invalid={invalid || undefined}
            />
            <span>{UNIT_LABEL[u]}</span>
          </label>
        ))}
      </div>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

interface DurationInputProps<
  TRecord = LooseRecord,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> extends InputProps<TRecord, TPath>,
    Omit<React.ComponentProps<"div">, "defaultValue" | "onBlur" | "onChange"> {
  /** Which units to expose. Default `["d","h","m","s"]`. */
  units?: readonly Unit[];
  disabled?: boolean;
}

export { DurationInput, type DurationInputProps };
