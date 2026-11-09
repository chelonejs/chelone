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
  // type-escape: context: the no-record sentinel `SourcePath` and `SourceValue` test for
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> = InputProps<TRecord, TPath> & {
  multiline?: boolean;
  inputClassName?: string;
  resettable?: boolean;
  className?: string;
  /**
   * Rendered over the control's right edge, inside the control's own row, so it
   * centres on the control whatever the field renders above or below it.
   */
  controlSuffix?: React.ReactNode;
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
 * Every control, `multiline` included, sits in a row of its own with
 * `controlSuffix`, so a wrapper can overlay a button on the control and have that
 * button centred on the control whatever the field renders above or below the row.
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
    controlSuffix,
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

  // The row is the positioned ancestor an overlay resolves against, so it holds
  // the control and the overlay alone: label, helper text and error stay out of
  // it, and an overlay centres on the control wherever the field puts it. Every
  // control gets the row, multiline included, so `controlSuffix` is never
  // silently dropped, and a single-line control keeps it even when a clear
  // button coming and going would otherwise move the input out from under the
  // caret.
  const control = multiline ? (
    <Textarea
      {...sanitizeInputRestProps(rest)}
      {...domField}
      id={id}
      aria-invalid={invalid || undefined}
      className={inputClassName}
    />
  ) : (
    <Input
      {...sanitizeInputRestProps(rest)}
      {...domField}
      id={id}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(inputClassName, resettable && hasValue && "pr-8")}
    />
  );

  const controlRow = (
    <div className="relative flex items-center">
      {control}
      {!multiline && resettable && hasValue ? (
        <button
          type="button"
          aria-label={translate("chelone.action.clear_input_value", {
            _: "Clear",
          })}
          className="absolute right-2 p-0 text-muted-foreground opacity-50 hover:opacity-100 hover:bg-transparent"
          onClick={handleReset}
          tabIndex={-1}
        >
          <X className="size-4" />
        </button>
      ) : null}
      {controlSuffix}
    </div>
  );

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
      {controlRow}
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

export { TextInput, type TextInputProps };
