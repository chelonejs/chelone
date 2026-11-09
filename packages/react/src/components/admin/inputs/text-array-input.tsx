import { type SourceProp, toTextList } from "@chelone/core";
import { X } from "lucide-react";
import * as React from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
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
import { ValidationError } from "../../../field-error-display";
import { useInput } from "../../../form-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useResourceContext } from "../../../resource";
import type { InputProps } from "../input-props";

type TagProps = { key: string | number; onDelete: () => void };

type TextArrayInputProps<
  // type-escape: context: the no-record sentinel `SourcePath` and `SourceValue` test for
  TRecord = unknown,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
> = InputProps<TRecord, TPath> & {
  className?: string;
  placeholder?: string;
  /** Autocomplete suggestions shown in a dropdown below the input. */
  options?: string[];
  /**
   * Custom tag renderer. When provided, replaces the default Badge-per-tag
   * rendering. `getTagProps(tag, index)` returns `{ key, onDelete }`.
   */
  renderTags?: (
    tags: string[],
    getTagProps: (tag: string, index: number) => TagProps,
  ) => React.ReactNode;
};

const emptyArray: string[] = [];

/**
 * Form input for editing an array of strings, like tags or email addresses.
 *
 * Renders a text input where values are displayed as removable badges. Users
 * type text and press Enter to add items, or press Backspace when the input is
 * empty to remove the last item. A single `useInput`-bound field holds the
 * whole `string[]` (no per-item array binding).
 *
 * @example
 * import { Edit, TextArrayInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <TextArrayInput source="tags" />
 *     <TextArrayInput source="emails" placeholder="Add an email..." />
 *   </Edit>
 * );
 */
function TextArrayInput(props: TextArrayInputProps) {
  const {
    className,
    defaultValue,
    disabled,
    format,
    helperText,
    label,
    name,
    onBlur,
    onChange,
    options,
    parse,
    placeholder,
    readOnly,
    renderTags,
    source,
    validate,
    ...rest
  } = props;
  const resource = useResourceContext(props);
  // chelone `useInput` derives the field name from `source` (no `name` key);
  // `name` is destructured out of props so it never reaches the DOM `rest`.
  void name;
  const { id, field, fieldState, isRequired } = useInput({
    defaultValue,
    format: format ?? ((v) => v ?? emptyArray),
    onBlur,
    onChange,
    parse,
    source,
    validate,
  });
  const translate = useTranslate();

  const invalid = fieldState.invalid;
  // chelone `fieldState.error` is ALREADY the displayable
  // `string | TranslatableMessage | undefined` — no RHF `error?.root?.message`.
  const error = fieldState.error;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState("");
  const [suggestionsOpen, setSuggestionsOpen] = React.useState(false);

  const values = toTextList(field.value);

  const filteredOptions = React.useMemo(() => {
    if (!options || !inputValue.trim()) return [];
    const lower = inputValue.toLowerCase();
    return options.filter(
      (opt) => opt.toLowerCase().includes(lower) && !values.includes(opt),
    );
  }, [options, inputValue, values]);

  const handleAddValue = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) {
      field.onChange([...values, trimmed]);
    }
    setInputValue("");
    setSuggestionsOpen(false);
  };

  const handleRemoveValue = (index: number) => {
    field.onChange(values.filter((_, i) => i !== index));
  };

  const getTagProps = (tag: string, index: number): TagProps => ({
    key: `${tag}-${index}`,
    onDelete: () => handleRemoveValue(index),
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        handleAddValue(inputValue);
      }
    } else if (
      e.key === "Backspace" &&
      inputValue === "" &&
      values.length > 0 &&
      !readOnly
    ) {
      field.onChange(values.slice(0, -1));
    } else if (e.key === "Escape") {
      setSuggestionsOpen(false);
      inputRef.current?.blur();
    }
  };

  const defaultTagRenderer = () =>
    values.map((value, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: tag values are user-entered primitives that may duplicate; index keeps keys unique and matches handleRemoveValue(index)
      <Badge key={`${value}-${index}`} variant="outline">
        {value}
        <button
          type="button"
          className="ml-1 cursor-pointer rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleRemoveValue(index);
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            handleRemoveValue(index);
          }}
          disabled={disabled || readOnly}
        >
          <span className="sr-only">
            {translate("chelone.action.remove", { _: "Remove" })}
          </span>
          <X className="size-3" />
        </button>
      </Badge>
    ));

  const showSuggestions =
    !!options && suggestionsOpen && filteredOptions.length > 0;

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
      <Popover open={showSuggestions} onOpenChange={setSuggestionsOpen}>
        <PopoverAnchor asChild>
          <div
            className="group rounded-md bg-background shadow-xs dark:bg-input/30 border border-input px-3 py-1.75 text-sm transition-all ring-offset-background focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]"
            {...rest}
          >
            <div className="flex flex-wrap gap-1">
              {renderTags
                ? renderTags(values, getTagProps)
                : defaultTagRenderer()}
              <input
                ref={inputRef}
                id={id}
                aria-invalid={invalid || undefined}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (options) setSuggestionsOpen(true);
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (inputValue.trim()) {
                    handleAddValue(inputValue);
                  }
                  field.onBlur?.();
                  // delay close so clicks on suggestions register first
                  setTimeout(() => setSuggestionsOpen(false), 150);
                }}
                placeholder={values.length === 0 ? placeholder : undefined}
                disabled={disabled}
                readOnly={readOnly}
                className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </PopoverAnchor>
        {showSuggestions && (
          <PopoverContent
            className="p-0 w-(--radix-popover-trigger-width)"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandList>
                <CommandEmpty>
                  {translate("chelone.navigation.no_results", {
                    _: "No results",
                  })}
                </CommandEmpty>
                <CommandGroup>
                  {filteredOptions.map((opt) => (
                    <CommandItem
                      key={opt}
                      value={opt}
                      onSelect={() => handleAddValue(opt)}
                    >
                      {opt}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

export { type TagProps, TextArrayInput, type TextArrayInputProps };
