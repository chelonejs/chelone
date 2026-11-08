import type { SourceProp } from "@chelone/core";
import { toNullableBooleanValue } from "@chelone/core";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useResourceContext } from "../../../resource";
import type { InputProps } from "../input-props";

const getBooleanFromString = (value: string): boolean | null => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const getStringFromBoolean = (value: boolean | null): string => {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
};

// Radix Select doesn't accept "" as a SelectItem value, so we use a sentinel
// string for the "null" option and map back to "" / null when reading/writing.
const NULL_OPTION = "__null__";

interface NullableBooleanInputProps<
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> extends Omit<InputProps<TRecord, TPath>, "format" | "parse"> {
  /** Read transform (`true`, `false` or `null` as stored → the select's `"true"`, `"false"` or `""`). */
  format?: (value: boolean | null) => string;
  /** Write transform (the select's `"true"`, `"false"` or `""` → stored value). */
  parse?: (value: string) => boolean | null;
  className?: string;
  nullLabel?: string;
  trueLabel?: string;
  falseLabel?: string;
}

/**
 * Three-option Select for boolean values that can be `null`.
 *
 * Use `<NullableBooleanInput>` when the field can be `true`, `false`, or `null`
 * (unknown). Renders a dropdown with three options (default labels: "", "Yes",
 * "No"), customizable via `nullLabel` / `trueLabel` / `falseLabel`.
 *
 * @example
 * import { Edit, NullableBooleanInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <NullableBooleanInput source="is_published" />
 *   </Edit>
 * );
 */
function NullableBooleanInput(props: NullableBooleanInputProps) {
  const {
    className,
    format = getStringFromBoolean,
    parse = getBooleanFromString,
    helperText,
    label,
    onBlur,
    onChange,
    resource: resourceProp,
    disabled,
    readOnly,
    source,
    validate,
    nullLabel,
    trueLabel,
    falseLabel,
  } = props;
  const resource = useResourceContext({ resource: resourceProp });
  const translate = useTranslate();

  // `resource`/`disabled`/`readOnly` are NOT `useInput` keys — `resource`
  // resolves the label, disabled/readOnly gate the `<Select>` below.
  // `format` and `parse` run here on the select's text, so the binding keeps
  // its defaults.
  const { id, field, fieldState, isRequired } = useInput({
    onBlur,
    source,
    validate,
  });

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  // The formatted value is "" / "true" / "false". Map "" to the sentinel.
  const text = format(toNullableBooleanValue(field.value));
  const selectValue = text === "" ? NULL_OPTION : text;

  const handleValueChange = (value: string) => {
    const next = value === NULL_OPTION ? "" : value;
    field.onChange(parse(next));
    onChange?.(next);
  };

  return (
    <Field
      data-invalid={invalid || undefined}
      className={cn("w-full min-w-20", className)}
    >
      {label !== false && label !== "" && (
        <FieldLabel htmlFor={id}>
          <FieldLabelText
            label={label}
            source={source}
            resource={resource}
            isRequired={isRequired}
          />
        </FieldLabel>
      )}
      <Select
        // Key based on value: avoids a Radix issue where onValueChange fires
        // with an empty string when the controlled value changes externally.
        key={`nullable-boolean:${selectValue}`}
        value={selectValue}
        onValueChange={handleValueChange}
        disabled={disabled || readOnly}
      >
        <SelectTrigger
          id={id}
          className="w-full transition-all hover:bg-accent"
          aria-invalid={invalid || undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={NULL_OPTION}>
            {nullLabel
              ? translate(nullLabel, { _: nullLabel })
              : translate("chelone.boolean.null", { _: "" })}
          </SelectItem>
          <SelectItem value="false">
            {falseLabel
              ? translate(falseLabel, { _: falseLabel })
              : translate("chelone.boolean.false", { _: "No" })}
          </SelectItem>
          <SelectItem value="true">
            {trueLabel
              ? translate(trueLabel, { _: trueLabel })
              : translate("chelone.boolean.true", { _: "Yes" })}
          </SelectItem>
        </SelectContent>
      </Select>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

export { NullableBooleanInput, type NullableBooleanInputProps };
