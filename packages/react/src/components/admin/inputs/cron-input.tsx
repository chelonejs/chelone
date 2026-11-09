import { type SourceProp, toTextValue } from "@chelone/core";
import type * as React from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useResourceContext } from "../../../resource";
import type { InputProps } from "../input-props";
import { describeCron } from "./cron-utils";

/**
 * Edits a 5-field cron expression and previews its human meaning live.
 *
 * @example
 * import { CronInput } from '@chelone/react';
 *
 * <CronInput source="schedule" />
 */
function CronInput(props: CronInputProps) {
  const {
    label,
    source,
    className,
    resource: resourceProp,
    helperText,
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

  const exprRaw = toTextValue(field.value);
  const preview = exprRaw ? describeCron(exprRaw) : null;

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
      <div className={cn("flex flex-col gap-1", className)} {...rest}>
        <Input
          type="text"
          value={exprRaw}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          disabled={disabled}
          placeholder="* * * * *"
          className="font-mono"
          id={id}
          aria-invalid={invalid || undefined}
        />
        <span data-cron-preview className="text-muted-foreground text-xs">
          {preview ?? (exprRaw && !preview ? "Invalid cron" : "")}
        </span>
      </div>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

interface CronInputProps<
  // type-escape: context: the no-record sentinel `SourcePath` and `SourceValue` test for
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> extends InputProps<TRecord, TPath>,
    Omit<React.ComponentProps<"div">, "defaultValue" | "onBlur" | "onChange"> {
  disabled?: boolean;
}

export { CronInput, type CronInputProps };
