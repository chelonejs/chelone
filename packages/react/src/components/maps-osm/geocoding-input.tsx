import {
  type GeocodeResult,
  type GeocodingProvider,
  type LngLatBox,
  type LooseRecord,
  type SourceProp,
  textOf,
} from "@chelone/core";
import { type KeyboardEvent, useEffect, useId, useState } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../field-error-display";
import { useCheloneFormContext, useWrappedSource } from "../../form-context";
import { useInput } from "../../form-hooks";
import { useTranslate } from "../../i18n-hooks";
import { useMapsConfig } from "../maps/maps-provider";
import { useGeocode } from "./use-geocode";

export interface GeocodingInputProps<TRecord = LooseRecord> {
  /** The form field holding the address text. */
  source: SourceProp<TRecord>;
  /** Written with the picked result's latitude. Left alone when unset. */
  latSource?: SourceProp<TRecord>;
  /** Written with the picked result's longitude. Left alone when unset. */
  lngSource?: SourceProp<TRecord>;
  /** Written with the picked result's `[west, south, east, north]`, when it has one. */
  bboxSource?: SourceProp<TRecord>;
  /** A string is translated; `false` renders none. Defaults to the label of `source`. */
  label?: string | false;
  /** Defaults to `chelone.map.search_placeholder`. */
  placeholder?: string;
  /** Defaults to the `geocoder` of `MapsProvider`. One of the two is required. */
  provider?: GeocodingProvider;
  /** Shortest trimmed query that searches. Defaults to 3. */
  minChars?: number;
  /** Typeahead providers only: wait after the last key. Defaults to 300. */
  debounceMs?: number;
  countryCodes?: string[];
  viewBox?: LngLatBox;
  limit?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * A text field that searches an address with a geocoding provider and fills
 * the form with the result the user picks. A provider that allows typeahead
 * searches as the user types; any other searches on Enter or on the button.
 * Typed text reaches the form when the field loses focus, so an address no
 * provider finds can still be entered by hand, and clears `latSource`,
 * `lngSource` and `bboxSource` so they never describe a different address; a
 * pick writes the result's `displayName` and its coordinates.
 *
 * The input is a `combobox` and the results are a `listbox` overlay anchored
 * under it, over the content below, so opening the list leaves the rest of the
 * form where it is. Same markup as the Vue adapter.
 *
 * @example
 * <GeocodingInput
 *   source="address"
 *   latSource="latitude"
 *   lngSource="longitude"
 *   provider={createNominatimProvider({ endpoint })}
 * />
 */
export function GeocodingInput<TRecord = LooseRecord>({
  source,
  latSource,
  lngSource,
  bboxSource,
  label,
  placeholder,
  provider,
  minChars = 3,
  debounceMs = 300,
  countryCodes,
  viewBox,
  limit,
  disabled = false,
  className,
}: GeocodingInputProps<TRecord>) {
  const translate = useTranslate();
  const { geocoder } = useMapsConfig();
  const activeProvider = provider ?? geocoder;
  const typeahead = activeProvider?.typeahead === true;

  const { id, field, fieldState, isRequired } = useInput({ source });
  const { ambient } = useCheloneFormContext().form;
  const wrappedLat = useWrappedSource(latSource ?? "");
  const wrappedLng = useWrappedSource(lngSource ?? "");
  const wrappedBbox = useWrappedSource(bboxSource ?? "");

  const saved = textOf(field.value);
  const [text, setText] = useState(saved);
  // What the search runs on: typing sets it for a typeahead provider, Enter or the button for any other.
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // The form changed the address from outside (a reset, a reverse geocode).
  useEffect(() => setText(saved), [saved]);

  const search = useGeocode(query, {
    provider,
    minChars,
    debounceMs: typeahead ? debounceMs : 0,
    countryCodes,
    viewBox,
    limit,
  });
  const results = search.data ?? [];
  // Not `query` itself: a typeahead search runs on the debounced value, so a query
  // that has reached `minChars` may not have started yet.
  const searched = search.isFetching || search.status !== "pending";
  const listed = open && searched;
  const showsOptions = listed && !search.isFetching && results.length > 0;
  const highlighted = showsOptions && active >= 0 ? active : -1;

  // A new answer is a different list: nothing is highlighted in it yet.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `search.data` is the intentional trigger; the body only clears the highlight.
  useEffect(() => setActive(-1), [search.data]);

  const listId = `${useId()}-listbox`;
  const optionId = (index: number) => `${listId}-${index}`;

  const onType = (value: string) => {
    setText(value);
    setActive(-1);
    if (typeahead) {
      setQuery(value);
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const runSearch = () => {
    // The same text keeps the same query key, which a failed search would never retry.
    if (query === text && search.isError) void search.refetch();
    setQuery(text);
    setOpen(true);
  };

  // A hand-typed address no longer matches the position of an earlier pick.
  const writeTyped = () => {
    field.onChange(text);
    if (latSource) ambient.setFieldValue(wrappedLat, null);
    if (lngSource) ambient.setFieldValue(wrappedLng, null);
    if (bboxSource) ambient.setFieldValue(wrappedBbox, null);
  };

  const pick = (result: GeocodeResult) => {
    field.onChange(result.displayName);
    setText(result.displayName);
    if (latSource) ambient.setFieldValue(wrappedLat, result.lat);
    if (lngSource) ambient.setFieldValue(wrappedLng, result.lng);
    if (bboxSource && result.bbox) {
      ambient.setFieldValue(wrappedBbox, [...result.bbox]);
    }
    setOpen(false);
    setActive(-1);
  };

  const move = (step: 1 | -1) => {
    const count = results.length;
    if (count === 0) return;
    setOpen(true);
    setActive((current) => {
      // Nothing is highlighted yet, which is not the same as being before the
      // first option: each arrow lands on the end it points at.
      if (current < 0) return step === 1 ? 0 : count - 1;
      return (current + step + count) % count;
    });
  };

  // An option's mousedown is prevented, so a click on one never blurs the input.
  const onBlur = () => {
    setOpen(false);
    setActive(-1);
    if (text !== saved) writeTyped();
    field.onBlur();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!showsOptions && !open) return;
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Enter") {
      // A search or a pick, not a form submit.
      event.preventDefault();
      const chosen = highlighted >= 0 ? results[highlighted] : undefined;
      if (chosen) pick(chosen);
      else if (!typeahead) runSearch();
    }
  };

  const shown = label === undefined || label ? label : false;

  return (
    <Field
      data-slot="geocoding-input"
      data-invalid={fieldState.invalid || undefined}
      className={className}
    >
      {shown !== false ? (
        <FieldLabel htmlFor={id}>
          <FieldLabelText
            label={shown}
            source={source}
            isRequired={isRequired}
          />
        </FieldLabel>
      ) : null}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            id={id}
            name={field.name}
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={listed}
            aria-controls={showsOptions ? listId : undefined}
            aria-activedescendant={
              highlighted >= 0 ? optionId(highlighted) : undefined
            }
            aria-label={
              shown === false
                ? translate("chelone.map.search_placeholder")
                : undefined
            }
            aria-invalid={fieldState.invalid || undefined}
            value={text}
            placeholder={
              placeholder ?? translate("chelone.map.search_placeholder")
            }
            disabled={disabled}
            onChange={(event) => onType(event.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          />
          {typeahead ? null : (
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={runSearch}
            >
              {translate("chelone.map.search_button")}
            </Button>
          )}
        </div>
        {listed ? (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            {search.isFetching ? (
              <p
                role="status"
                className="px-2 py-3 text-sm text-muted-foreground"
              >
                {translate("chelone.map.searching")}
              </p>
            ) : search.isError ? (
              <p
                role="alert"
                className="px-2 py-3 text-sm text-muted-foreground"
              >
                {translate("chelone.map.search_failed")}
              </p>
            ) : results.length === 0 ? (
              <p
                role="status"
                className="px-2 py-3 text-sm text-muted-foreground"
              >
                {translate("chelone.map.no_results")}
              </p>
            ) : (
              <div
                id={listId}
                role="listbox"
                className="max-h-64 overflow-auto p-1"
              >
                {results.map((result, index) => (
                  // The combobox keeps focus on the input, which moves the
                  // highlight with the arrow keys and picks it with Enter.
                  // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard-only picking runs through the input, not through the option
                  // biome-ignore lint/a11y/useFocusableInteractive: same pattern: an option is never focused, so it needs no tabindex
                  <div
                    key={`${result.displayName}:${result.lat}:${result.lng}`}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === highlighted}
                    className={cn(
                      "cursor-default rounded-sm px-2 py-1.5 text-sm outline-hidden select-none",
                      index === highlighted &&
                        "bg-accent text-accent-foreground",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pick(result)}
                  >
                    <span className="flex flex-col">
                      <span>{result.displayName}</span>
                      {result.type ? (
                        <span className="text-xs text-muted-foreground">
                          {result.type}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
      <FieldError>
        {fieldState.invalid && fieldState.error ? (
          <ValidationError error={fieldState.error} />
        ) : null}
      </FieldError>
    </Field>
  );
}
