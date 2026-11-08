import {
  type ChoiceValueOf,
  type FilterPayload,
  type SourceProp,
  toChoiceValue,
} from "@chelone/core";
import { Check, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { areIdsEqual } from "@/lib/are-ids-equal";
import { cn } from "@/lib/utils";
import type { ChoiceRecord } from "../../../choices-hooks";
import { useChoices, useChoicesContext } from "../../../choices-hooks";
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useGetChoiceRepresentationText } from "../../../label";
import { useEvent } from "../../../util/use-event";
import type {
  ChoicesProps,
  InputProps,
  LooseFormatProps,
} from "../input-props";
import { createDebounce } from "./create-debounce";

/**
 * Searchable dropdown for choosing a single scalar value.
 *
 * Editing a scalar with a searchable dropdown interface. Works inside
 * `<ReferenceInput>` for editing foreign-key relationships (the ambient choices
 * context supplies choices + server-side filtering via `setFilters`).
 *
 * @example
 * import { Create, AutocompleteInput, ReferenceInput } from '@/components/admin';
 *
 * const PostCreate = () => (
 *   <Create>
 *     <AutocompleteInput
 *       source="category"
 *       choices={[
 *         { id: 'tech', name: 'Tech' },
 *         { id: 'lifestyle', name: 'Lifestyle' },
 *         { id: 'people', name: 'People' },
 *       ]}
 *     />
 *     <ReferenceInput label="Author" source="author_id" reference="authors">
 *       <AutocompleteInput />
 *     </ReferenceInput>
 *   </Create>
 * );
 */
function AutocompleteInput<
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
  TChoice extends ChoiceRecord = ChoiceRecord,
>(props: AutocompleteInputProps<TRecord, TPath, TChoice>) {
  const {
    debounce: debounceDelay = 250,
    filterToQuery = DefaultFilterToQuery,
    inputText,
    modal,
    limitChoicesToValue = false,
    suggestionLimit,
    noOptionsText,
    emptyValue = "",
    clearOnBlur = false,
    openOnFocus = false,
    selectOnFocus = false,
    handleHomeEndKeys = false,
    isOptionEqualToValue,
    matchSuggestion,
    shouldRenderSuggestions,
    emptyText: emptyTextProp = "",
    setFilter,
  } = props;
  const {
    allChoices = [],
    source,
    resource,
    isFromReference,
    setFilters,
  } = useChoicesContext<TChoice>({
    choices: props.choices,
    source: props.source,
  });

  if (source === undefined) {
    throw new Error(
      `If you're not wrapping the AutocompleteInput inside a ReferenceInput, you must provide the source prop`,
    );
  }

  // `resource`/`disabled`/`readOnly` are component-local, NOT `useInput` keys.
  const { id, field, fieldState, isRequired } = useInput({ ...props, source });
  const fieldValue = toChoiceValue<TChoice>(field.value);
  const translate = useTranslate();
  const {
    placeholder = translate("chelone.action.search", { _: "Search..." }),
  } = props;

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const getChoiceRepresentationText =
    useGetChoiceRepresentationText<TChoice>(resource);
  const { getChoiceText, getChoiceValue } = useChoices<TChoice>({
    optionText:
      props.optionText ??
      (isFromReference ? getChoiceRepresentationText : undefined),
    optionValue: props.optionValue,
    disableValue: props.disableValue,
    translateChoice: props.translateChoice ?? !isFromReference,
  });

  const [filterValue, setFilterValue] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  // Keep stable references so the debounced setter isn't recreated each render
  // (which would defeat debouncing).
  const setFiltersRef = useRef(setFilters);
  const filterToQueryRef = useRef(filterToQuery);
  useEffect(() => {
    setFiltersRef.current = setFilters;
  }, [setFilters]);
  useEffect(() => {
    filterToQueryRef.current = filterToQuery;
  }, [filterToQuery]);

  const debouncedSetFilters = useMemo(
    () =>
      createDebounce((filter: string) => {
        setFiltersRef.current(filterToQueryRef.current(filter));
      }, debounceDelay),
    [debounceDelay],
  );

  // Cancel any in-flight debounced call on unmount.
  useEffect(() => () => debouncedSetFilters.cancel(), [debouncedSetFilters]);

  // Reset filter when field.value changes externally (e.g. form reset).
  // biome-ignore lint/correctness/useExhaustiveDependencies: field.value is the intentional trigger; the body only cancels/clears and does not read it.
  useEffect(() => {
    debouncedSetFilters.cancel();
    setFilterValue("");
  }, [field.value, debouncedSetFilters]);

  const [open, setOpen] = React.useState(false);
  const listboxId = React.useId();

  const isEqual = useCallback(
    (choiceVal: ChoiceValueOf<TChoice>, fieldVal: ChoiceValueOf<TChoice>) =>
      isOptionEqualToValue
        ? isOptionEqualToValue(choiceVal, fieldVal)
        : areIdsEqual(choiceVal, fieldVal),
    [isOptionEqualToValue],
  );

  const selectedChoice = allChoices.find((choice) =>
    isEqual(getChoiceValue(choice), fieldValue),
  );

  const getInputText = useCallback(
    (choice: TChoice) =>
      typeof inputText === "function"
        ? inputText(choice)
        : getChoiceText(choice),
    [inputText, getChoiceText],
  );

  const handleOpenChange = useEvent((isOpen: boolean) => {
    setOpen(isOpen);
    // Reset the filter (immediately, no debounce) so re-opening shows the full
    // list.
    if (!isOpen) {
      debouncedSetFilters.cancel();
      setFilters(filterToQuery(""));
    }
  });

  const handleChange = useCallback(
    (choice: TChoice) => {
      if (isEqual(getChoiceValue(choice), fieldValue) && !isRequired) {
        field.onChange(emptyValue);
        setFilterValue("");
        if (isFromReference) {
          debouncedSetFilters.cancel();
          setFilters(filterToQuery(""));
        }
        setOpen(false);
        return;
      }
      field.onChange(getChoiceValue(choice));
      setOpen(false);
    },
    [
      field,
      fieldValue,
      getChoiceValue,
      isRequired,
      isEqual,
      emptyValue,
      isFromReference,
      setFilters,
      filterToQuery,
      debouncedSetFilters,
    ],
  );

  // limitChoicesToValue — show only the matching choice.
  let availableChoices = limitChoicesToValue
    ? allChoices.filter((c) => isEqual(getChoiceValue(c), fieldValue))
    : allChoices;

  // matchSuggestion — custom client-side filter for non-reference inputs.
  if (matchSuggestion && !isFromReference && filterValue !== "") {
    availableChoices = availableChoices.filter((choice) =>
      matchSuggestion(filterValue, choice),
    );
  }

  // suggestionLimit — cap after filtering.
  if (suggestionLimit !== undefined) {
    availableChoices = availableChoices.slice(0, suggestionLimit);
  }

  const finalChoices = availableChoices;

  const noMatchText =
    noOptionsText ??
    translate("chelone.navigation.no_results", {
      _: "No matching item found.",
    });

  const effectiveOpen =
    open && (!shouldRenderSuggestions || shouldRenderSuggestions(filterValue));

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!handleHomeEndKeys) return;
      if (e.key === "Home") {
        e.preventDefault();
        listRef.current?.scrollTo(0, 0);
      } else if (e.key === "End") {
        e.preventDefault();
        listRef.current?.scrollTo(0, listRef.current.scrollHeight);
      }
    },
    [handleHomeEndKeys],
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (openOnFocus) setOpen(true);
      if (selectOnFocus) e.currentTarget.select();
    },
    [openOnFocus, selectOnFocus],
  );

  const handleBlur = useCallback(() => {
    if (clearOnBlur) setFilterValue("");
  }, [clearOnBlur]);

  return (
    <Field className={props.className} data-invalid={invalid || undefined}>
      {props.label !== false && (
        <FieldLabel htmlFor={id}>
          <FieldLabelText
            label={props.label}
            source={props.source ?? source}
            resource={resource}
            isRequired={isRequired}
          />
        </FieldLabel>
      )}
      <Popover
        open={effectiveOpen}
        onOpenChange={handleOpenChange}
        modal={modal}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-invalid={invalid || undefined}
            className="h-auto w-full justify-between py-1.75 font-normal"
          >
            {selectedChoice ? (
              getInputText(selectedChoice)
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full max-w-(--radix-popover-trigger-width) p-0">
          {/* We filter ourselves when matchSuggestion is provided or reference. */}
          <Command shouldFilter={!isFromReference && !matchSuggestion}>
            <CommandInput
              placeholder={translate("chelone.action.search", {
                _: "Search...",
              })}
              value={filterValue}
              onValueChange={(filter) => {
                setFilterValue(filter);
                setFilter?.(filter);
                requestAnimationFrame(() => {
                  listRef.current?.scrollTo(0, 0);
                });
                // Don't filter the ChoicesContext for a non-reference input — it
                // would also filter out the selected value.
                if (isFromReference) {
                  debouncedSetFilters(filter);
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <CommandList id={listboxId} ref={listRef}>
              <CommandEmpty>{noMatchText}</CommandEmpty>
              <CommandGroup>
                {emptyTextProp !== "" && !isRequired && (
                  <CommandItem
                    value={`__empty__${emptyTextProp}`}
                    onSelect={() => {
                      field.onChange(emptyValue);
                      setFilterValue("");
                      setOpen(false);
                    }}
                    className="text-muted-foreground"
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        field.value === emptyValue ||
                          field.value == null ||
                          field.value === ""
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {emptyTextProp}
                  </CommandItem>
                )}
                {finalChoices.map((choice) => {
                  const choiceText = getChoiceText(choice);
                  return (
                    <CommandItem
                      key={String(getChoiceValue(choice))}
                      keywords={
                        React.isValidElement(choiceText)
                          ? undefined
                          : [choiceText]
                      }
                      value={String(getChoiceValue(choice))}
                      onSelect={() => handleChange(choice)}
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          isEqual(fieldValue, getChoiceValue(choice))
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {choiceText}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <InputHelperText helperText={props.helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

const DefaultFilterToQuery = (searchText: string): FilterPayload => ({
  q: searchText,
});

type AutocompleteInputProps<
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
  TChoice extends ChoiceRecord = ChoiceRecord,
> = Omit<InputProps<TRecord, TPath>, "source" | "format"> &
  Partial<Pick<InputProps<TRecord, TPath>, "source">> &
  LooseFormatProps &
  ChoicesProps<TChoice> & {
    className?: string;
    debounce?: number;
    filterToQuery?: (searchText: string) => FilterPayload;
    placeholder?: string;
    /** Custom display text for the selected value in the trigger. */
    inputText?: (choice: TChoice) => string;
    /** When true, only show choices matching the current value. */
    limitChoicesToValue?: boolean;
    /** Cap the number of dropdown items shown. */
    suggestionLimit?: number;
    /** Content to show when no choices match the filter. */
    noOptionsText?: React.ReactNode;
    /** Underlying value used when clearing the selection. Defaults to "". */
    emptyValue?: string | number;
    /** When true, clear the filter text on input blur. */
    clearOnBlur?: boolean;
    /** When true, open the dropdown on input focus. */
    openOnFocus?: boolean;
    /** When true, select all text in the input on focus. */
    selectOnFocus?: boolean;
    /** When true, Home/End keys scroll the listbox to first/last item. */
    handleHomeEndKeys?: boolean;
    /** Custom equality check between a choice value and the current value. */
    isOptionEqualToValue?: (
      option: ChoiceValueOf<TChoice>,
      value: ChoiceValueOf<TChoice>,
    ) => boolean;
    /** Custom filter function; replaces default substring match. */
    matchSuggestion?: (filter: string, choice: TChoice) => boolean;
    /** Gate controlling whether the dropdown opens at all. */
    shouldRenderSuggestions?: (filter: string) => boolean;
    /** Label of a "(none)" entry prepended when the field is not required. */
    emptyText?: string;
    /** Called with the current filter text on every keystroke (no debounce). */
    setFilter?: (filter: string) => void;
    /** Radix popover modality. */
    modal?: boolean;
  };

export { AutocompleteInput, type AutocompleteInputProps };
