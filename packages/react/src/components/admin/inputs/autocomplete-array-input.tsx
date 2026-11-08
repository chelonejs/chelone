import {
  type ChoiceValueOf,
  type FilterPayload,
  type SourceProp,
  toChoiceValues,
} from "@chelone/core";
import { Command as CommandPrimitive } from "cmdk";
import { X } from "lucide-react";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { areIdsEqual } from "@/lib/are-ids-equal";
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
 * Searchable dropdown for choosing multiple values, shown as removable badges.
 *
 * Editing an array value with a searchable dropdown. Works inside
 * `<ReferenceArrayInput>` for many-to-many relationships (the ambient choices
 * context supplies choices + server-side filtering via `setFilters`).
 *
 * @example
 * import { Create, AutocompleteArrayInput, ReferenceArrayInput } from '@/components/admin';
 *
 * const PostCreate = () => (
 *   <Create>
 *     <AutocompleteArrayInput
 *       source="tags"
 *       choices={[
 *         { id: 'tech', name: 'Tech' },
 *         { id: 'news', name: 'News' },
 *         { id: 'lifestyle', name: 'Lifestyle' },
 *       ]}
 *     />
 *   </Create>
 * );
 */
function AutocompleteArrayInput<
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
  TChoice extends ChoiceRecord = ChoiceRecord,
>(props: AutocompleteArrayInputProps<TRecord, TPath, TChoice>) {
  const {
    debounce: debounceDelay = 250,
    filterToQuery = DefaultFilterToQuery,
    inputText,
    modal,
    limitChoicesToValue = false,
    suggestionLimit,
    noOptionsText,
    clearOnBlur = false,
    selectOnFocus = false,
    handleHomeEndKeys = false,
    isOptionEqualToValue,
    matchSuggestion,
    shouldRenderSuggestions,
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
      `If you're not wrapping the AutocompleteArrayInput inside a ReferenceArrayInput, you must provide the source prop`,
    );
  }

  // `resource`/`disabled`/`readOnly` are component-local, NOT `useInput` keys.
  const { id, field, fieldState, isRequired } = useInput({ ...props, source });
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

  const values = toChoiceValues<TChoice>(field.value);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);

  // Keep stable references so the debounced setter isn't recreated each render.
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
        // chelone `setFilters(filter, debounce?)` — the array variant applies
        // the debounce flag (ra's 3-arg `(filters, displayedFilters, debounce)`
        // collapses to chelone's 2-arg form).
        setFiltersRef.current(filterToQueryRef.current(filter), true);
      }, debounceDelay),
    [debounceDelay],
  );

  useEffect(() => () => debouncedSetFilters.cancel(), [debouncedSetFilters]);

  const [filterValue, setFilterValue] = React.useState("");

  // Reset filter when field.value changes externally (e.g. form reset).
  // biome-ignore lint/correctness/useExhaustiveDependencies: field.value is the intentional trigger; the body only cancels/clears and does not read it.
  useEffect(() => {
    debouncedSetFilters.cancel();
    setFilterValue("");
  }, [field.value, debouncedSetFilters]);

  const isEqual = useCallback(
    (choiceVal: ChoiceValueOf<TChoice>, fieldVal: ChoiceValueOf<TChoice>) =>
      isOptionEqualToValue
        ? isOptionEqualToValue(choiceVal, fieldVal)
        : areIdsEqual(choiceVal, fieldVal),
    [isOptionEqualToValue],
  );

  const handleUnselect = useEvent((choice: TChoice) => {
    field.onChange(values.filter((v) => !isEqual(getChoiceValue(choice), v)));
    field.onBlur();
  });

  const handleKeyDown = useEvent((e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if ((e.key === "Delete" || e.key === "Backspace") && input.value === "") {
        field.onChange(values.slice(0, -1));
      }
      if (e.key === "Escape") {
        input.blur();
      }
    }
  });

  const unselectedChoices = allChoices.filter(
    (choice) => !values.some((v) => isEqual(getChoiceValue(choice), v)),
  );
  const selectedChoices = allChoices.filter((choice) =>
    values.some((v) => isEqual(getChoiceValue(choice), v)),
  );

  // limitChoicesToValue — show only selected choices in the dropdown.
  let availableChoices = limitChoicesToValue
    ? selectedChoices
    : unselectedChoices;

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

  const effectiveOpen =
    open && (!shouldRenderSuggestions || shouldRenderSuggestions(filterValue));

  const emptyText =
    noOptionsText ??
    translate("chelone.navigation.no_results", {
      _: "No matching item found.",
    });

  const getInputText = useCallback(
    (choice: TChoice) =>
      typeof inputText === "function"
        ? inputText(choice)
        : getChoiceText(choice),
    [inputText, getChoiceText],
  );

  const handleInputKeyDown = useCallback(
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

  // The array variant always opens on focus.
  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setOpen(true);
      if (selectOnFocus) e.currentTarget.select();
    },
    [selectOnFocus],
  );

  const handleBlur = useCallback(() => {
    setOpen(false);
    if (clearOnBlur) setFilterValue("");
  }, [clearOnBlur]);

  const finalChoices = availableChoices;

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
      <Command
        onKeyDown={handleKeyDown}
        shouldFilter={!isFromReference && !matchSuggestion}
        className="overflow-visible bg-transparent"
      >
        <Popover
          open={effectiveOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) setOpen(false);
          }}
          modal={modal}
        >
          <PopoverAnchor asChild>
            <div
              ref={anchorRef}
              className="group rounded-md border border-input bg-transparent px-3 py-1.75 text-sm ring-offset-background transition-all focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30"
            >
              <div className="flex flex-wrap gap-1">
                {selectedChoices.map((choice) => (
                  <Badge key={String(getChoiceValue(choice))} variant="outline">
                    {getInputText(choice)}
                    <button
                      type="button"
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUnselect(choice);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        handleUnselect(choice);
                      }}
                    >
                      <span className="sr-only">
                        {translate("chelone.action.remove", { _: "Remove" })}
                      </span>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
                {/* Avoid the "Search" icon by not using CommandInput. */}
                <CommandPrimitive.Input
                  ref={inputRef}
                  id={id}
                  aria-invalid={invalid || undefined}
                  value={filterValue}
                  onValueChange={(filter) => {
                    setFilterValue(filter);
                    setFilter?.(filter);
                    requestAnimationFrame(() => {
                      listRef.current?.scrollTo(0, 0);
                    });
                    // Don't filter the ChoicesContext for a non-reference input —
                    // it would also filter out the selected values.
                    if (isFromReference) {
                      debouncedSetFilters(filter);
                    }
                  }}
                  onBlur={handleBlur}
                  onFocus={handleFocus}
                  onKeyDown={handleInputKeyDown}
                  placeholder={placeholder}
                  className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </PopoverAnchor>
          <PopoverContent
            style={{ width: "var(--radix-popover-trigger-width)" }}
            className="p-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              if (anchorRef.current?.contains(e.target as Node)) {
                e.preventDefault();
              }
            }}
          >
            <CommandList ref={listRef}>
              {finalChoices.length > 0 ? (
                <CommandGroup>
                  {finalChoices.map((choice) => {
                    const choiceText = getChoiceText(choice);
                    return (
                      <CommandItem
                        key={String(getChoiceValue(choice))}
                        value={String(getChoiceValue(choice))}
                        keywords={
                          React.isValidElement(choiceText)
                            ? undefined
                            : [choiceText]
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onSelect={() => {
                          setFilterValue("");
                          if (isFromReference) {
                            debouncedSetFilters.cancel();
                            setFilters(filterToQuery(""));
                          }
                          field.onChange([...values, getChoiceValue(choice)]);
                          field.onBlur();
                        }}
                        className="cursor-pointer"
                      >
                        {choiceText}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {emptyText}
                </div>
              )}
            </CommandList>
          </PopoverContent>
        </Popover>
      </Command>
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

type AutocompleteArrayInputProps<
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
    /** Custom display text for badge labels. */
    inputText?: (choice: TChoice) => string;
    /** When true, only show already-selected choices in the dropdown. */
    limitChoicesToValue?: boolean;
    /** Cap the number of dropdown items shown. */
    suggestionLimit?: number;
    /** Content to show when no choices match the filter. */
    noOptionsText?: React.ReactNode;
    /** When true, clear the filter text on input blur. */
    clearOnBlur?: boolean;
    /** When true, open the dropdown on input focus (default for the array variant). */
    openOnFocus?: boolean;
    /** When true, select all text in the input on focus. */
    selectOnFocus?: boolean;
    /** When true, Home/End keys scroll the listbox to first/last item. */
    handleHomeEndKeys?: boolean;
    /** Custom equality check between a choice value and a selected value. */
    isOptionEqualToValue?: (
      option: ChoiceValueOf<TChoice>,
      value: ChoiceValueOf<TChoice>,
    ) => boolean;
    /** Custom filter function; replaces default substring match. */
    matchSuggestion?: (filter: string, choice: TChoice) => boolean;
    /** Gate controlling whether the dropdown opens at all. */
    shouldRenderSuggestions?: (filter: string) => boolean;
    /** Accepted for API parity; not rendered in the array variant. */
    emptyText?: string;
    /** Called with the current filter text on every keystroke (no debounce). */
    setFilter?: (filter: string) => void;
    /** Radix popover modality. */
    modal?: boolean;
  };

export { AutocompleteArrayInput, type AutocompleteArrayInputProps };
