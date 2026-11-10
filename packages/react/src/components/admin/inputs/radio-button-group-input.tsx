import type { SourceProp } from "@chelone/core";
import type * as React from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ChoiceRecord } from "../../../choices-hooks";
import { useChoices, useChoicesContext } from "../../../choices-hooks";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { sanitizeInputRestProps } from "../../../util/sanitize-input-rest-props";
import type { ChoicesProps, InputProps } from "../input-props";

interface RadioButtonGroupInputProps<
  TChoice extends ChoiceRecord = ChoiceRecord,
> extends Partial<InputProps>,
    ChoicesProps<TChoice>,
    Omit<
      React.ComponentProps<typeof RadioGroup>,
      "defaultValue" | "onBlur" | "onChange" | "type"
    > {
  row?: boolean;
  options?: React.ComponentProps<typeof RadioGroup>;
}

/**
 * Single-select input rendered as a list of radio buttons, arranged vertically
 * or horizontally.
 *
 * Use `<RadioButtonGroupInput>` for a small set of options (2-5) that users
 * should see at once (status, priority, category). For longer lists prefer
 * `<SelectInput>`. Set `row` to `true` for horizontal layout.
 *
 * @example
 * import { Edit, RadioButtonGroupInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <RadioButtonGroupInput
 *       source="category"
 *       choices={[
 *         { id: 'tech', name: 'Tech' },
 *         { id: 'lifestyle', name: 'Lifestyle' },
 *         { id: 'people', name: 'People' },
 *       ]}
 *     />
 *   </Edit>
 * );
 */
function RadioButtonGroupInput<TChoice extends ChoiceRecord = ChoiceRecord>(
  props: RadioButtonGroupInputProps<TChoice>,
) {
  const {
    choices: choicesProp,
    resource: resourceProp,
    source: sourceProp,

    format,
    onBlur,
    onChange,
    parse,
    validate,
    defaultValue,
    disabled,
    readOnly,

    optionText,
    optionValue,
    translateChoice,
    disableValue,

    className,
    helperText,
    label,
    row,
    options,
    ...rest
  } = props;

  // chelone `useChoicesContext` takes only `{ choices, source }`.
  const {
    allChoices,
    isPending,
    error: fetchError,
    resource,
    source,
  } = useChoicesContext<TChoice, SourceProp>({
    choices: choicesProp,
    source: sourceProp,
  });

  if (source === undefined) {
    throw new Error(
      `If you're not wrapping the RadioButtonGroupInput inside a ReferenceArrayInput, you must provide the source prop`,
    );
  }

  // `resource`/`disabled`/`readOnly` are component-local, NOT `useInput` keys.
  const { id, field, fieldState, isRequired } = useInput({
    format,
    onBlur,
    onChange,
    parse,
    source,
    validate,
    defaultValue,
  });

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const { getChoiceText, getChoiceValue, getDisableValue } =
    useChoices<TChoice>({
      optionText,
      optionValue,
      translateChoice,
      disableValue,
    });

  if (isPending) {
    return <Skeleton className="h-9 w-full" />;
  }

  return (
    <FieldSet className={className} data-invalid={invalid || undefined}>
      {label !== false && label !== "" && (
        <FieldLegend variant="label">
          <FieldLabelText
            label={label}
            source={source}
            resource={resource ?? resourceProp}
            isRequired={isRequired}
          />
        </FieldLegend>
      )}
      <RadioGroup
        {...sanitizeInputRestProps(rest)}
        {...options}
        // Radix RadioGroup only deals in string values; coerce here but pass the
        // original (possibly numeric) id back on change.
        value={field.value != null ? String(field.value) : undefined}
        onValueChange={(nextValue) => {
          const choice = allChoices?.find(
            (c) => String(getChoiceValue(c)) === nextValue,
          );
          field.onChange(choice ? getChoiceValue(choice) : nextValue);
        }}
        className={cn("flex", row ? "flex-row gap-4" : "flex-col gap-2")}
        disabled={disabled || readOnly}
      >
        {allChoices?.map((choice) => {
          const value = getChoiceValue(choice);
          const stringValue = String(value);
          const isDisabled =
            disabled || readOnly || getDisableValue(choice) === true;

          return (
            <Field
              key={stringValue}
              orientation="horizontal"
              data-disabled={isDisabled || undefined}
            >
              <RadioGroupItem
                value={stringValue}
                id={`${id}-${stringValue}`}
                disabled={isDisabled}
              />
              <FieldLabel
                htmlFor={`${id}-${stringValue}`}
                className="font-normal"
              >
                {getChoiceText(choice)}
              </FieldLabel>
            </Field>
          );
        })}
      </RadioGroup>
      <InputHelperText helperText={helperText ?? fetchError?.message} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </FieldSet>
  );
}

export { RadioButtonGroupInput, type RadioButtonGroupInputProps };
