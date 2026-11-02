import type { GeoBBox, GeocodeResult, GeocodingProvider } from "@chelone/core";
import { useEffect, useState } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { ValidationError } from "../../field-error-display";
import { useCheloneFormContext, useWrappedSource } from "../../form-context";
import { useInput } from "../../form-hooks";
import { useTranslate } from "../../i18n-hooks";
import { useMapsConfig } from "../maps/maps-provider";
import { useGeocode } from "./use-geocode";

export interface GeocodingInputProps {
  /** The form field holding the address text. */
  source: string;
  /** Written with the picked result's latitude. Left alone when unset. */
  latSource?: string;
  /** Written with the picked result's longitude. Left alone when unset. */
  lngSource?: string;
  /** Written with the picked result's `[west, south, east, north]`, when it has one. */
  bboxSource?: string;
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
  viewBox?: GeoBBox;
  limit?: number;
  disabled?: boolean;
  className?: string;
}

const toText = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

/**
 * A text field that searches an address with a geocoding provider and fills
 * the form with the result the user picks. A provider that allows typeahead
 * searches as the user types; any other searches on Enter or on the button.
 * Typed text reaches the form when the field loses focus, so an address no
 * provider finds can still be entered by hand, and clears `latSource`,
 * `lngSource` and `bboxSource` so they never describe a different address; a
 * pick writes the result's `displayName` and its coordinates.
 *
 * @example
 * <GeocodingInput
 *   source="address"
 *   latSource="latitude"
 *   lngSource="longitude"
 *   provider={createNominatimProvider({ endpoint })}
 * />
 */
export function GeocodingInput({
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
}: GeocodingInputProps) {
  const translate = useTranslate();
  const { geocoder } = useMapsConfig();
  const activeProvider = provider ?? geocoder;
  const typeahead = activeProvider?.typeahead === true;

  const { id, field, fieldState, isRequired } = useInput({ source });
  const { form } = useCheloneFormContext();
  const wrappedLat = useWrappedSource(latSource ?? "");
  const wrappedLng = useWrappedSource(lngSource ?? "");
  const wrappedBbox = useWrappedSource(bboxSource ?? "");

  const saved = toText(field.value);
  const [text, setText] = useState(saved);
  // What the search runs on: typing sets it for a typeahead provider, Enter or the button for any other.
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

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

  const onType = (value: string) => {
    setText(value);
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
    if (latSource) form.setFieldValue(wrappedLat, null);
    if (lngSource) form.setFieldValue(wrappedLng, null);
    if (bboxSource) form.setFieldValue(wrappedBbox, null);
  };

  const pick = (result: GeocodeResult) => {
    field.onChange(result.displayName);
    setText(result.displayName);
    if (latSource) form.setFieldValue(wrappedLat, result.lat);
    if (lngSource) form.setFieldValue(wrappedLng, result.lng);
    if (bboxSource && result.bbox) {
      form.setFieldValue(wrappedBbox, [...result.bbox]);
    }
    setOpen(false);
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
      <Command
        shouldFilter={false}
        className="h-auto overflow-visible bg-transparent"
      >
        <div className="flex gap-2">
          <CommandInput
            id={id}
            name={field.name}
            value={text}
            disabled={disabled}
            placeholder={
              placeholder ?? translate("chelone.map.search_placeholder")
            }
            aria-label={
              shown === false
                ? translate("chelone.map.search_placeholder")
                : undefined
            }
            aria-invalid={fieldState.invalid || undefined}
            onValueChange={onType}
            onBlur={() => {
              if (text !== saved) writeTyped();
              field.onBlur();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && open) {
                event.stopPropagation();
                setOpen(false);
              } else if (event.key === "Enter" && !open) {
                // A search, not a form submit.
                event.preventDefault();
                if (!typeahead) runSearch();
              }
            }}
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
        {open && searched ? (
          <CommandList>
            {search.isFetching ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                {translate("chelone.map.searching")}
              </div>
            ) : search.isError ? (
              <div
                role="alert"
                className="px-2 py-3 text-sm text-muted-foreground"
              >
                {translate("chelone.map.search_failed")}
              </div>
            ) : results.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                {translate("chelone.map.no_results")}
              </div>
            ) : (
              results.map((result, index) => (
                <CommandItem
                  key={`${result.displayName}:${result.lat}:${result.lng}`}
                  value={`${index}`}
                  onSelect={() => pick(result)}
                >
                  <span className="flex flex-col">
                    <span>{result.displayName}</span>
                    {result.type ? (
                      <span className="text-xs text-muted-foreground">
                        {result.type}
                      </span>
                    ) : null}
                  </span>
                </CommandItem>
              ))
            )}
          </CommandList>
        ) : null}
      </Command>
      <FieldError>
        {fieldState.invalid && fieldState.error ? (
          <ValidationError error={fieldState.error} />
        ) : null}
      </FieldError>
    </Field>
  );
}
