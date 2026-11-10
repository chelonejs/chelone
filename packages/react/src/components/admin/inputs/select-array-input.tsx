import {
  type ChoiceValueOf,
  type SourceProp,
  toChoiceValues,
} from "@chelone/core";
import { ChevronDown, X } from "lucide-react";
import * as React from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ChoiceRecord } from "../../../choices-hooks";
import { useChoices, useChoicesContext } from "../../../choices-hooks";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useGetChoiceRepresentationText } from "../../../label";
import type {
  ChoicesProps,
  InputProps,
  LooseFormatProps,
} from "../input-props";

/**
 * Multi-select dropdown input for choosing several values from a list.
 *
 * Use `<SelectArrayInput>` for array fields with many possible values (5+) where
 * you want a compact UI: a button shows selected items as badges and opens a
 * popover with checkboxes. Unlike `<AutocompleteArrayInput>` it is not
 * searchable. Wrap in `<ReferenceArrayInput>` to select from related resources.
 *
 * @example
 * import { Edit, SelectArrayInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <SelectArrayInput
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
function SelectArrayInput<
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
  TChoice extends ChoiceRecord = ChoiceRecord,
>(props: SelectArrayInputProps<TRecord, TPath, TChoice>) {
  const {
    choices: choicesProp,
    resource: resourceProp,
    source: sourceProp,

    optionText,
    optionValue,
    disableValue,
    translateChoice,
    InputLabelProps,

    label,
    helperText,
    readOnly,
    disabled,
    placeholder,
    className,
    ...inputOptions
  } = props;
  const translate = useTranslate();
  const [open, setOpen] = React.useState(false);
  const listboxId = React.useId();

  // chelone `useChoicesContext` takes only `{ choices, source }`.
  const {
    allChoices,
    isPending,
    error: fetchError,
    source,
    resource,
    isFromReference,
  } = useChoicesContext<TChoice, TPath>({
    choices: choicesProp,
    source: sourceProp,
  });

  if (source === undefined) {
    throw new Error(
      `If you're not wrapping the SelectArrayInput inside a ReferenceArrayInput, you must provide the source prop`,
    );
  }

  const getChoiceRepresentationText =
    useGetChoiceRepresentationText<TChoice>(resource);
  const { getChoiceText, getChoiceValue, getDisableValue } =
    useChoices<TChoice>({
      optionText:
        optionText ??
        (isFromReference ? getChoiceRepresentationText : undefined),
      optionValue,
      disableValue,
      translateChoice: translateChoice ?? !isFromReference,
    });

  // `resource`/`disabled`/`readOnly` are component-local, NOT `useInput` keys.
  const { id, field, fieldState, isRequired } = useInput<TRecord, TPath>({
    ...inputOptions,
    source,
  });

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const value = toChoiceValues<TChoice>(field.value);

  const handleToggle = (choiceValue: ChoiceValueOf<TChoice>) => {
    const isSelected = value.some((v) => String(v) === String(choiceValue));
    const next = isSelected
      ? value.filter((v) => String(v) !== String(choiceValue))
      : [...value, choiceValue];
    field.onChange(next);
  };

  if (isPending) {
    return (
      <Field
        className={cn("w-full min-w-20", className)}
        data-invalid={invalid || undefined}
      >
        {label !== false && label !== "" && (
          <FieldLabel htmlFor={id}>
            <FieldLabelText
              label={label}
              source={source}
              resource={resourceProp}
              isRequired={isRequired}
            />
          </FieldLabel>
        )}
        <Skeleton className="h-9 w-full" />
        <InputHelperText helperText={helperText} />
        <FieldError>
          {invalid && error ? <ValidationError error={error} /> : null}
        </FieldError>
      </Field>
    );
  }

  const choicesArr = fetchError ? [] : (allChoices ?? []);
  const selectedChoices = choicesArr.filter((choice) =>
    value.some((v) => String(v) === String(getChoiceValue(choice))),
  );

  const handleClear = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    field.onChange([]);
  };

  return (
    <Field
      className={cn("w-full min-w-20", className)}
      data-invalid={invalid || undefined}
    >
      {label !== false && label !== "" && (
        <FieldLabel htmlFor={id} {...InputLabelProps}>
          <FieldLabelText
            label={label}
            source={source}
            resource={resourceProp}
            isRequired={isRequired}
          />
        </FieldLabel>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-invalid={invalid || undefined}
            disabled={disabled || readOnly}
            className="h-auto min-h-9 w-full justify-between py-1.5 font-normal hover:bg-accent"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {selectedChoices.length === 0 ? (
                <span className="text-muted-foreground">
                  {placeholder ?? " "}
                </span>
              ) : (
                selectedChoices.map((choice) => (
                  <Badge
                    key={String(getChoiceValue(choice))}
                    variant="outline"
                    className="font-normal"
                  >
                    {getChoiceText(choice)}
                  </Badge>
                ))
              )}
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-1">
              {selectedChoices.length > 0 && !disabled && !readOnly ? (
                // biome-ignore lint/a11y/useSemanticElements: the combobox trigger is itself a <button>; a nested <button> is invalid HTML, so the clear control is a focusable role="button" span
                <span
                  role="button"
                  tabIndex={0}
                  className="pointer-events-auto p-0 text-muted-foreground opacity-50 hover:bg-transparent hover:opacity-100"
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleClear(e);
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label={translate("chelone.action.clear_input_value", {
                    _: "Clear value",
                  })}
                >
                  <X className="size-4" />
                </span>
              ) : null}
              <ChevronDown className="size-4 opacity-50" aria-hidden="true" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-0"
          align="start"
        >
          <div
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            className="flex max-h-64 flex-col overflow-auto py-1"
          >
            {choicesArr.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {translate("chelone.navigation.no_results", {
                  _: "No results",
                })}
              </p>
            ) : (
              choicesArr.map((choice) => {
                const choiceValue = getChoiceValue(choice);
                const choiceText = getChoiceText(choice);
                const isChoiceDisabled = getDisableValue(choice) === true;
                const isSelected = value.some(
                  (v) => String(v) === String(choiceValue),
                );
                const itemId = `${id}-${choiceValue}`;
                return (
                  <label
                    key={String(choiceValue)}
                    htmlFor={itemId}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent",
                      isChoiceDisabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Checkbox
                      id={itemId}
                      checked={isSelected}
                      disabled={isChoiceDisabled}
                      onCheckedChange={() => handleToggle(choiceValue)}
                    />
                    <span className="flex-1">{choiceText}</span>
                  </label>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

type SelectArrayInputProps<
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
  TChoice extends ChoiceRecord = ChoiceRecord,
> = ChoicesProps<TChoice> &
  // `source` is optional: a SelectArrayInput inside a ReferenceArrayInput
  // inherits it.
  Partial<Omit<InputProps<TRecord, TPath>, "format">> &
  LooseFormatProps & {
    className?: string;
    placeholder?: string;
    InputLabelProps?: React.ComponentProps<typeof FieldLabel>;
  };

export { SelectArrayInput, type SelectArrayInputProps };
