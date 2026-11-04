import type * as React from "react";
import type { ComponentProps } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ChoiceRecord } from "../../../choices-hooks";
import { useChoices, useChoicesContext } from "../../../choices-hooks";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useGetRecordRepresentationText } from "../../../label";
import { sanitizeInputRestProps } from "../../../util/sanitize-input-rest-props";
import type { ChoicesProps, InputProps } from "../input-props";

interface CheckboxGroupInputProps<TChoice extends ChoiceRecord = ChoiceRecord>
  extends Partial<InputProps>,
    ChoicesProps<TChoice>,
    // The rendered root is a `<fieldset>` (via `<FieldSet>`); extend the
    // fieldset attribute surface so the passthrough `{...rest}` typechecks.
    Omit<
      React.FieldsetHTMLAttributes<HTMLFieldSetElement>,
      "defaultValue" | "onBlur" | "onChange"
    > {
  row?: boolean;
  options?: ComponentProps<typeof Checkbox>;
  labelPlacement?: "end" | "start" | "top" | "bottom";
}

/**
 * Multi-select input rendered as a list of checkboxes (vertical or horizontal).
 *
 * Use `<CheckboxGroupInput>` for a small set of options (2-6) where users pick
 * several at once. The form value is an array of choice ids. For longer lists
 * prefer `<SelectArrayInput>` or `<AutocompleteArrayInput>`. Set `row` to `true`
 * for horizontal layout.
 *
 * @example
 * import { Edit, CheckboxGroupInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <CheckboxGroupInput
 *       source="tags"
 *       choices={[
 *         { id: 'tech', name: 'Tech' },
 *         { id: 'lifestyle', name: 'Lifestyle' },
 *         { id: 'people', name: 'People' },
 *       ]}
 *     />
 *   </Edit>
 * );
 */
function CheckboxGroupInput<TChoice extends ChoiceRecord = ChoiceRecord>(
  props: CheckboxGroupInputProps<TChoice>,
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
    row = false,
    options,
    labelPlacement = "end",
    ...rest
  } = props;

  // chelone `useChoicesContext` takes only `{ choices, source }`.
  const {
    allChoices,
    isPending,
    error: fetchError,
    resource,
    source,
    isFromReference,
  } = useChoicesContext<TChoice>({ choices: choicesProp, source: sourceProp });

  if (source === undefined) {
    throw new Error(
      `If you're not wrapping the CheckboxGroupInput inside a ReferenceArrayInput, you must provide the source prop`,
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

  const getRecordRepresentationText = useGetRecordRepresentationText(resource);
  const { getChoiceText, getChoiceValue, getDisableValue } =
    useChoices<TChoice>({
      optionText:
        optionText ??
        (isFromReference ? getRecordRepresentationText : undefined),
      optionValue,
      translateChoice: translateChoice ?? !isFromReference,
      disableValue,
    });

  if (isPending) {
    return <Skeleton className="h-9 w-full" />;
  }

  const value: unknown[] = Array.isArray(field.value) ? field.value : [];
  const isChecked = (choiceValue: unknown) =>
    value.some((v) => String(v) === String(choiceValue));

  const handleCheck = (choiceValue: unknown, checked: boolean) => {
    const next = checked
      ? [...value, choiceValue]
      : value.filter((v) => String(v) !== String(choiceValue));
    field.onChange(next);
    field.onBlur();
  };

  return (
    <FieldSet
      className={className}
      data-invalid={invalid || undefined}
      {...sanitizeInputRestProps(rest as Record<string, unknown>)}
    >
      {label !== false && (
        <FieldLegend variant="label">
          <FieldLabelText
            label={label}
            source={source}
            resource={resource ?? resourceProp}
            isRequired={isRequired}
          />
        </FieldLegend>
      )}
      <div className={cn("flex", row ? "flex-row gap-4" : "flex-col gap-2")}>
        {allChoices?.map((choice) => {
          const choiceValue = getChoiceValue(choice);
          const isChoiceDisabled =
            disabled || readOnly || getDisableValue(choice) === true;
          const choiceId = `${id}-${choiceValue}`;

          const checkbox = (
            <Checkbox
              id={choiceId}
              checked={isChecked(choiceValue)}
              disabled={isChoiceDisabled}
              onCheckedChange={(checked) =>
                handleCheck(choiceValue, checked === true)
              }
              {...options}
            />
          );
          const labelEl = (
            <FieldLabel htmlFor={choiceId} className="font-normal">
              {getChoiceText(choice)}
            </FieldLabel>
          );

          const isTop = labelPlacement === "top";
          const isBottom = labelPlacement === "bottom";
          const isStart = labelPlacement === "start";

          return (
            <Field
              key={String(choiceValue)}
              orientation={isTop || isBottom ? "vertical" : "horizontal"}
              data-disabled={isChoiceDisabled || undefined}
              className={cn(
                isTop || isBottom ? "items-start gap-y-1" : undefined,
                isTop && "flex-col-reverse",
              )}
            >
              {isStart || isTop ? labelEl : null}
              {checkbox}
              {!isStart && !isTop ? labelEl : null}
            </Field>
          );
        })}
      </div>
      <InputHelperText
        helperText={helperText ?? (fetchError as Error | undefined)?.message}
      />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </FieldSet>
  );
}

export { CheckboxGroupInput, type CheckboxGroupInputProps };
