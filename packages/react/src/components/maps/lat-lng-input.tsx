import {
  latitude,
  longitude,
  type MapStyleInput,
  toCoordinate,
  type Validator,
} from "@chelone/core";
import { useEffect, useRef, useState } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../field-error-display";
import { useInput } from "../../form-hooks";
import { MapCanvas, MapMarker, useMap } from "./map-canvas";

export interface LatLngInputProps {
  /** The form field holding the latitude. */
  latSource: string;
  /** The form field holding the longitude. */
  lngSource: string;
  /** The legend. A string is translated; `false` renders none. */
  label?: string | false;
  helperText?: string;
  /** Run after the -90..90 range check. */
  latValidate?: Validator | readonly Validator[];
  /** Run after the -180..180 range check. */
  lngValidate?: Validator | readonly Validator[];
  /** `[lat, lng]`. The map centre while either field is empty. Defaults to `[0, 0]`. */
  defaultPosition?: readonly [lat: number, lng: number];
  /** Read once at mount. Defaults to 13. */
  zoom?: number;
  /** In pixels, or any CSS length. Defaults to 300. */
  height?: number | string;
  /** Defaults to the style from `MapsProvider`. */
  mapStyle?: MapStyleInput;
  /** Disables both text fields and the pin; pan and zoom still work. */
  disabled?: boolean;
  /** Called with the new position after a click or a pin drag, never for typing or a reset. */
  onPositionChange?: (lat: number, lng: number) => void;
  className?: string;
}

const toText = (value: unknown) =>
  typeof value === "number" ? `${value}` : "";

/** About 10 cm, so the text fields stay readable. */
const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

/** A click on a repeated copy of the world reports a longitude past 180. */
const wrapLng = (lng: number) =>
  Math.abs(lng) <= 180 ? lng : ((((lng + 180) % 360) + 360) % 360) - 180;

/** MapLibre throws on a coordinate outside its range. */
function inRange(value: number | null, limit: number): value is number {
  return value !== null && Math.abs(value) <= limit;
}

function toArray(
  validate: Validator | readonly Validator[] | undefined,
): readonly Validator[] {
  if (validate === undefined) return [];
  return typeof validate === "function" ? [validate] : validate;
}

/** Digits with an optional sign and point: what a coordinate looks like while it is typed. */
const TYPING = /^[+-]?\d*\.?\d*$/;

/**
 * One coordinate's input binding. The form stores a number or `null`, so a
 * half-typed "-" or "1." would be wiped on the next render; `draft` keeps the
 * typed text while it still parses to the stored value. Text that cannot lead
 * to a number ("12x", "1,5") is refused, and a leftover "-" is dropped on
 * blur, so the field never shows text the form does not hold.
 */
function useCoordinate(
  source: string,
  validate: readonly Validator[],
  range: Validator,
) {
  const { id, field, fieldState, isRequired } = useInput({
    source,
    parse: toCoordinate,
    format: toText,
    validate: [range, ...validate],
  });
  const [draft, setDraft] = useState<string | null>(null);
  const stored = toCoordinate(field.value);
  const text =
    draft !== null && toCoordinate(draft) === stored
      ? draft
      : (field.value as string);
  return {
    id,
    field,
    fieldState,
    isRequired,
    stored,
    text,
    onType: (event: { target: { value: string } }) => {
      if (!TYPING.test(event.target.value)) return;
      setDraft(event.target.value);
      field.onChange(event);
    },
    onBlur: () => {
      if (draft !== null && toCoordinate(draft) === null) setDraft(null);
      field.onBlur();
    },
  };
}

/** Recentres the map on a position the form changed from outside. */
function Recentre({
  position,
  gesture,
}: {
  position: readonly [number, number] | null;
  gesture: React.RefObject<readonly [number, number] | null>;
}) {
  const map = useMap();
  const lat = position?.[0];
  const lng = position?.[1];
  const seen = useRef<string | null>(
    lat === undefined ? null : `${lat},${lng}`,
  );
  useEffect(() => {
    if (lat === undefined || lng === undefined) {
      seen.current = null;
      return;
    }
    const key = `${lat},${lng}`;
    if (seen.current === key) return;
    seen.current = key;
    const own = gesture.current;
    gesture.current = null;
    if (own && own[0] === lat && own[1] === lng) return;
    map.easeTo({ center: [lng, lat] });
  }, [map, lat, lng, gesture]);
  return null;
}

/** Reports a click on the map unless the input is disabled. */
function ClickToPlace({
  disabled,
  onPlace,
}: {
  disabled: boolean;
  onPlace: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const latest = useRef({ disabled, onPlace });
  latest.current = { disabled, onPlace };
  useEffect(() => {
    const handler = (event: { lngLat: { lat: number; lng: number } }) => {
      if (latest.current.disabled) return;
      latest.current.onPlace(event.lngLat.lat, event.lngLat.lng);
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map]);
  return null;
}

/**
 * Edits a latitude and a longitude held in two form fields, by typing or by
 * clicking a map. The pin shows once both are numbers; dragging it or clicking
 * the map writes both fields rounded to 6 decimals.
 *
 * Needs the optional `maplibre-gl` peer.
 *
 * @example
 * <LatLngInput latSource="latitude" lngSource="longitude" label="Location" />
 */
export function LatLngInput({
  latSource,
  lngSource,
  label,
  helperText,
  latValidate,
  lngValidate,
  defaultPosition = [0, 0],
  zoom = 13,
  height = 300,
  mapStyle,
  disabled = false,
  onPositionChange,
  className,
}: LatLngInputProps) {
  const lat = useCoordinate(latSource, toArray(latValidate), latitude());
  const lng = useCoordinate(lngSource, toArray(lngValidate), longitude());

  const position =
    inRange(lat.stored, 90) && inRange(lng.stored, 180)
      ? ([lat.stored, lng.stored] as const)
      : null;

  // The position of the last map gesture, so the form change it caused does not recentre the map.
  const gesture = useRef<readonly [number, number] | null>(null);
  const latest = useRef({ lat: lat.field, lng: lng.field, onPositionChange });
  latest.current = { lat: lat.field, lng: lng.field, onPositionChange };

  const place = (rawLat: number, rawLng: number) => {
    const nextLat = round6(rawLat);
    const nextLng = round6(wrapLng(rawLng));
    gesture.current = [nextLat, nextLng];
    const now = latest.current;
    now.lat.onChange(nextLat);
    now.lat.onBlur();
    now.lng.onChange(nextLng);
    now.lng.onBlur();
    now.onPositionChange?.(nextLat, nextLng);
  };

  const [centreLat, centreLng] = position ?? defaultPosition;

  return (
    <FieldSet
      data-slot="lat-lng-input"
      className={cn("gap-3", className)}
      data-invalid={
        lat.fieldState.invalid || lng.fieldState.invalid || undefined
      }
    >
      {label ? (
        <FieldLegend variant="label">
          <FieldLabelText label={label} />
        </FieldLegend>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {[
          { source: latSource, input: lat },
          { source: lngSource, input: lng },
        ].map(({ source, input }) => (
          <Field
            key={source}
            data-invalid={input.fieldState.invalid || undefined}
          >
            <FieldLabel htmlFor={input.id}>
              <FieldLabelText source={source} isRequired={input.isRequired} />
            </FieldLabel>
            <Input
              id={input.id}
              name={input.field.name}
              inputMode="decimal"
              value={input.text}
              disabled={disabled}
              aria-invalid={input.fieldState.invalid || undefined}
              onChange={input.onType}
              onBlur={input.onBlur}
            />
            <FieldError>
              {input.fieldState.invalid && input.fieldState.error ? (
                <ValidationError error={input.fieldState.error} />
              ) : null}
            </FieldError>
          </Field>
        ))}
      </div>
      <InputHelperText helperText={helperText} />
      <MapCanvas
        center={[centreLat, centreLng]}
        zoom={zoom}
        height={height}
        mapStyle={mapStyle}
      >
        <ClickToPlace disabled={disabled} onPlace={place} />
        <Recentre position={position} gesture={gesture} />
        {position ? (
          <MapMarker
            position={position}
            draggable={!disabled}
            onDragEnd={place}
          />
        ) : null}
      </MapCanvas>
    </FieldSet>
  );
}
