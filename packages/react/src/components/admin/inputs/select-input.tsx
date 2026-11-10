import type { SourceProp } from "@chelone/core";
import { X } from "lucide-react";
import type { ComponentProps, ReactElement } from "react";
import { useCallback, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ChoiceRecord } from "../../../choices-hooks";
import { useChoices, useChoicesContext } from "../../../choices-hooks";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useGetChoiceRepresentationText } from "../../../label";
import { sanitizeInputRestProps } from "../../../util/sanitize-input-rest-props";
import type { ChoicesProps, InputProps } from "../input-props";

/**
 * Dropdown select input for choosing a single value from a list of options.
 *
 * Use `<SelectInput>` for fields with many possible values (5+) like categories,
 * statuses, or countries. Wrap in `<ReferenceInput>` to select from related
 * resources (the ambient `<ChoicesContextProvider>` supplies the choices, so
 * `source`/`choices` become optional). Wraps shadcn's `<Select>`.
 *
 * @example
 * import { Edit, SelectInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <SelectInput
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
function SelectInput<TChoice extends ChoiceRecord = ChoiceRecord>(
  props: SelectInputProps<TChoice>,
) {
  const {
    choices: choicesProp,
    resource: resourceProp,
    source: sourceProp,

    optionText,
    optionValue,
    disableValue,
    translateChoice,

    defaultValue,
    format,
    label,
    helperText,
    name,
    onBlur,
    onChange,
    parse,
    validate,
    readOnly,
    disabled,

    className,
    emptyText = "",
    emptyValue = "",
    resettable = true,

    ...rest
  } = props;
  const translate = useTranslate();

  useEffect(() => {
    if (emptyValue == null) {
      throw new Error(
        `emptyValue being set to null or undefined is not supported. Use parse to turn the empty string into null.`,
      );
    }
  }, [emptyValue]);

  // chelone `useChoicesContext` takes only `{ choices, source }`; a reference
  // context (isFromReference) is supplied ambiently and carries its own
  // `resource`/`source`. `name` is a legacy alias — `source` drives the wiring.
  void name;
  const {
    allChoices,
    isPending,
    error: fetchError,
    source,
    resource,
    isFromReference,
  } = useChoicesContext<TChoice, SourceProp>({
    choices: choicesProp,
    source: sourceProp,
  });

  if (source === undefined) {
    throw new Error(
      `If you're not wrapping the SelectInput inside a ReferenceInput, you must provide the source prop`,
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

  // `resource`/`disabled`/`readOnly` are component-local (label + control
  // gating), NOT `useInput` keys.
  const { id, field, fieldState, isRequired } = useInput({
    defaultValue,
    format,
    onBlur,
    onChange,
    parse,
    source,
    validate,
  });

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const renderEmptyItemOption = useCallback(() => {
    return typeof emptyText === "string"
      ? emptyText === ""
        ? " " // em space, forces the display of an empty line of normal height
        : translate(emptyText, { _: emptyText })
      : emptyText;
  }, [emptyText, translate]);

  const handleChange = useCallback(
    (value: string) => {
      if (value === emptyValue) {
        field.onChange(emptyValue);
        return;
      }
      // Radix Select only deals in strings, but the original choice id may be
      // numeric. Stringify both sides for comparison and submit the *original*
      // id type so numeric ids aren't silently corrupted into strings.
      const choice = allChoices?.find(
        (c) => String(getChoiceValue(c)) === value,
      );
      field.onChange(choice ? getChoiceValue(choice) : value);
    },
    [field, getChoiceValue, emptyValue, allChoices],
  );

  if (isPending) {
    return (
      <Field
        className={cn("w-full min-w-20", className)}
        data-invalid={invalid || undefined}
      >
        {label !== "" && label !== false && (
          <FieldLabel htmlFor={id}>
            <FieldLabelText
              label={label}
              source={source}
              resource={resourceProp}
              isRequired={isRequired}
            />
          </FieldLabel>
        )}
        <div className="relative">
          <Skeleton className="h-9 w-full" />
        </div>
        <InputHelperText helperText={helperText} />
        <FieldError>
          {invalid && error ? <ValidationError error={error} /> : null}
        </FieldError>
      </Field>
    );
  }

  const finalChoices = fetchError ? [] : (allChoices ?? []);

  const handleReset = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    field.onChange(emptyValue);
  };

  const stringValue = field.value != null ? String(field.value) : "";

  return (
    <Field
      className={cn("w-full min-w-20", className)}
      data-invalid={invalid || undefined}
      {...sanitizeInputRestProps(rest)}
    >
      {label !== "" && label !== false && (
        <FieldLabel htmlFor={id}>
          <FieldLabelText
            label={label}
            source={source}
            resource={resourceProp}
            isRequired={isRequired}
          />
        </FieldLabel>
      )}
      <div className="relative">
        <Select
          // FIXME https://github.com/radix-ui/primitives/issues/3135
          // Keying on the value fixes an issue where onValueChange fired with an
          // empty string when the controlled value changed externally.
          key={`select:${stringValue || String(emptyValue)}`}
          value={stringValue || String(emptyValue)}
          onValueChange={handleChange}
          disabled={disabled || readOnly}
        >
          <SelectTrigger
            id={id}
            aria-invalid={invalid || undefined}
            className="w-full transition-all hover:bg-accent"
          >
            <SelectValue placeholder={renderEmptyItemOption()} />

            {resettable && field.value && field.value !== emptyValue ? (
              // <span> not <button>: SelectTrigger is itself a <button> and HTML
              // forbids nested interactive controls.
              // biome-ignore lint/a11y/useSemanticElements: a nested <button> inside the trigger <button> is invalid HTML; a focusable role="button" span with a keyboard handler is the accessible alternative
              <span
                role="button"
                tabIndex={0}
                aria-label={translate("chelone.action.clear_input_value", {
                  _: "Clear",
                })}
                className="pointer-events-auto ml-auto p-0 text-muted-foreground opacity-50 hover:bg-transparent hover:opacity-100"
                onClick={handleReset}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleReset(e);
                  }
                }}
              >
                <X className="size-4" />
              </span>
            ) : null}
          </SelectTrigger>
          <SelectContent position="popper">
            {finalChoices.map((choice) => {
              const value = getChoiceValue(choice);
              const isDisabled = getDisableValue(choice);
              return (
                <SelectItem
                  key={String(value)}
                  value={value != null ? String(value) : ""}
                  disabled={isDisabled}
                >
                  {getChoiceText(choice)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <InputHelperText helperText={helperText ?? fetchError?.message} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

type SelectInputProps<TChoice extends ChoiceRecord = ChoiceRecord> =
  ChoicesProps<TChoice> &
    // `source` is optional: a SelectInput inside a ReferenceInput inherits it.
    Partial<InputProps> & {
      emptyText?: string | ReactElement;
      emptyValue?: string | number | boolean | null;
      onChange?: (value: string) => void;
      resettable?: boolean;
    } & Omit<ComponentProps<typeof Field>, "children">;

export { SelectInput, type SelectInputProps };
