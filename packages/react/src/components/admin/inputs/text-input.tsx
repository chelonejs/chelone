import { type SourceProp, toTextValue } from "@chelone/core";
import { X } from "lucide-react";
import type * as React from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useResourceContext } from "../../../resource";
import { sanitizeInputRestProps } from "../../../util/sanitize-input-rest-props";
import type { InputProps } from "../input-props";

type TextInputProps<
  // type-escape: the no-record sentinel `SourcePath` and `SourceValue` test for
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> = InputProps<TRecord, TPath> & {
  multiline?: boolean;
  inputClassName?: string;
  resettable?: boolean;
  className?: string;
} & Omit<
    React.ComponentProps<"textarea">,
    "onChange" | "onBlur" | "type" | "defaultValue"
  > &
  Omit<
    React.ComponentProps<"input">,
    "onChange" | "onBlur" | "type" | "defaultValue"
  >;

/**
 * Single-line or multiline text input for string values.
 *
 * Use `<TextInput>` for short text fields like titles or names. Set `multiline`
 * to `true` for longer content like descriptions or comments. Wraps shadcn's
 * `<Input>` or `<Textarea>` component depending on the `multiline` prop.
 *
 * @example
 * import { Edit, TextInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <TextInput source="title" />
 *     <TextInput source="description" multiline rows={4} />
 *   </Edit>
 * );
 */
function TextInput(props: TextInputProps) {
  const resource = useResourceContext(props);
  const {
    label,
    source,
    multiline,
    className,
    inputClassName,
    helperText,
    resettable = false,
    type = "text",
    ...rest
  } = props;
  const { id, field, fieldState, isRequired } = useInput(props);
  const translate = useTranslate();

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;
  const text = toTextValue(field.value);
  const hasValue = text !== "";
  const domField = { ...field, value: text };

  const handleReset = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    field.onChange("");
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
      {multiline ? (
        <Textarea
          {...sanitizeInputRestProps(rest)}
          {...domField}
          id={id}
          aria-invalid={invalid || undefined}
          className={inputClassName}
        />
      ) : resettable ? (
        <div className="relative flex items-center">
          <Input
            {...sanitizeInputRestProps(rest)}
            {...domField}
            id={id}
            type={type}
            aria-invalid={invalid || undefined}
            className={cn(inputClassName, hasValue && "pr-8")}
          />
          {hasValue && (
            <button
              type="button"
              aria-label={translate("ra.action.clear_input_value", {
                _: "Clear",
              })}
              className="absolute right-2 p-0 text-muted-foreground opacity-50 hover:opacity-100 hover:bg-transparent"
              onClick={handleReset}
              tabIndex={-1}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      ) : (
        <Input
          {...sanitizeInputRestProps(rest)}
          {...domField}
          id={id}
          type={type}
          aria-invalid={invalid || undefined}
          className={inputClassName}
        />
      )}
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

export { TextInput, type TextInputProps };
