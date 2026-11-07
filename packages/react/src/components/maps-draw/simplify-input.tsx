import {
  asFeatureCollection,
  DEFAULT_MAP_ZOOM,
  deepEqual,
  geoBounds,
  isGeoJsonValue,
  isLngLatBox,
  type LngLatBox,
  type LooseRecord,
  type MapStyleInput,
  type ShapeStyle,
  type ShapeValue,
  type SourceProp,
} from "@chelone/core";
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../field-error-display";
import { useInput } from "../../form-hooks";
import { useTranslate } from "../../i18n-hooks";
import { useGeoJsonSource } from "../maps/geo-json-field";
import { MapCanvas, useMap } from "../maps/map-canvas";
import { type DrawValue, simplifyGeo } from "./geometry-ops";

export type SimplifyQuality = "Default" | "High";

export interface SimplifyInputProps<TRecord = LooseRecord> {
  /** The form field holding a Geometry, Feature or FeatureCollection. */
  source: SourceProp<TRecord>;
  /** The legend. A string is translated; `false` renders none. */
  label?: ReactNode | false;
  helperText?: ReactNode | false;
  /** Read once at mount. Defaults to 13. */
  zoom?: number;
  /** `[lat, lng]`. Read once at mount. Defaults to `[0, 0]`. */
  defaultCenter?: readonly [lat: number, lng: number];
  /** In pixels, or any CSS length. Defaults to 400. */
  height?: number | string;
  /** Defaults to the style from `MapsProvider`. */
  mapStyle?: MapStyleInput;
  /** Partial over `DEFAULT_SHAPE_STYLE`. */
  shapeStyle?: ShapeStyle;
  /** The slider's initial value, in degrees. Defaults to 0.01. */
  tolerance?: number;
  /** Defaults to 0. */
  minTolerance?: number;
  /** Defaults to 0.05. */
  maxTolerance?: number;
  /** Defaults to 0.001. */
  step?: number;
  /** The initial algorithm. `High` is slower and keeps more detail. Defaults to `Default`. */
  quality?: SimplifyQuality;
  className?: string;
}

/** Shows `value` and frames the map on it each time its box changes. */
function Preview({
  value,
  shapeStyle,
}: {
  value: DrawValue;
  shapeStyle: ShapeStyle | undefined;
}) {
  const map = useMap();
  const sourceId = `simplify-input-${useId()}`;
  const data = useMemo(() => asFeatureCollection(value), [value]);
  useGeoJsonSource(map, sourceId, data, shapeStyle ?? {});

  const box = useMemo(() => geoBounds(value), [value]);
  // The box as text, so a new object with the same corners does not refit.
  const boxKey = box ? box.join(",") : "";
  const latest = useRef(box);
  latest.current = box;
  // biome-ignore lint/correctness/useExhaustiveDependencies: boxKey stands for the box
  useEffect(() => {
    if (!isLngLatBox(latest.current)) return;
    map.fitBounds(latest.current, { padding: 20, maxZoom: 18, duration: 0 });
  }, [map, boxKey]);
  return null;
}

/**
 * Thins a stored Geometry, Feature or FeatureCollection with a tolerance
 * slider, and previews the result on a map. The form holds the simplified
 * value. The first value is kept as the original: every slider or quality
 * change simplifies from it, so sliding back to the minimum restores it. A
 * value that arrives from outside, such as a reset or a record load, becomes
 * the new original.
 *
 * The initial tolerance applies on load, but the form changes only when the
 * result differs from its value. A null value shows an empty state. Any other
 * value than GeoJSON or null on first render throws.
 *
 * Draws nothing: it needs the optional `maplibre-gl` and `@turf/simplify` peers.
 *
 * @example
 * <SimplifyInput source="outline" label="Outline" tolerance={0.005} />
 */
export function SimplifyInput<TRecord = LooseRecord>({
  source,
  label,
  helperText,
  zoom = DEFAULT_MAP_ZOOM,
  defaultCenter = [0, 0],
  height = 400,
  mapStyle,
  shapeStyle,
  tolerance: initialTolerance = 0.01,
  minTolerance = 0,
  maxTolerance = 0.05,
  step = 0.001,
  quality: initialQuality = "Default",
  className,
}: SimplifyInputProps<TRecord>) {
  const translate = useTranslate();
  const { field, fieldState, isRequired } = useInput({
    source,
    format: (v) => v ?? null,
  });
  const value = field.value;

  const checked = useRef(false);
  if (!checked.current) {
    checked.current = true;
    if (value !== null && !isGeoJsonValue(value)) {
      throw new Error("SimplifyInput: source must be GeoJSON or null");
    }
  }

  const [tolerance, setTolerance] = useState(initialTolerance);
  const [quality, setQuality] = useState<SimplifyQuality>(initialQuality);

  const original = useRef<DrawValue | null>(null);
  // What this input wrote last, to tell its own writes from a reset or a load.
  const written = useRef<Exclude<ShapeValue, LngLatBox> | null>(null);
  const onChange = useRef(field.onChange);
  onChange.current = field.onChange;

  useEffect(() => {
    if (!isGeoJsonValue(value)) return;
    // By identity: a reload equal to the last write is still a new original.
    if (original.current === null || value !== written.current) {
      original.current = value;
    }
    const next = simplifyGeo(original.current, {
      tolerance,
      highQuality: quality === "High",
    });
    if (deepEqual(next, value)) return;
    written.current = next;
    onChange.current(next);
  }, [value, tolerance, quality]);

  const invalid = fieldState.invalid;
  const error = fieldState.error;
  const sliderId = useId();

  return (
    <FieldSet
      data-slot="simplify-input"
      className={cn("gap-3", className)}
      data-invalid={invalid || undefined}
    >
      {label !== false && (
        <FieldLegend variant="label">
          <FieldLabelText
            label={label}
            source={source}
            isRequired={isRequired}
          />
        </FieldLegend>
      )}
      {isGeoJsonValue(value) ? (
        <>
          <MapCanvas
            center={defaultCenter}
            zoom={zoom}
            height={height}
            mapStyle={mapStyle}
          >
            <Preview value={value} shapeStyle={shapeStyle} />
          </MapCanvas>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-48 flex-1 flex-col gap-2">
              <span id={sliderId} className="text-sm">
                {translate("chelone.map.simplify.tolerance", {
                  value: tolerance.toFixed(3),
                  _: "Tolerance: {value}",
                })}
              </span>
              <Slider
                aria-labelledby={sliderId}
                min={minTolerance}
                max={maxTolerance}
                step={step}
                value={[tolerance]}
                onValueChange={([next]) => {
                  if (next !== undefined) setTolerance(next);
                }}
                onValueCommit={() => field.onBlur()}
              />
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              value={quality}
              onValueChange={(next) => {
                // Pressing the pressed item clears the group: keep the quality.
                if (next === "Default" || next === "High") setQuality(next);
              }}
            >
              <ToggleGroupItem value="Default">
                {translate("chelone.map.simplify.default", { _: "Default" })}
              </ToggleGroupItem>
              <ToggleGroupItem value="High">
                {translate("chelone.map.simplify.high", { _: "High" })}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </>
      ) : (
        <div
          data-slot="simplify-input-empty"
          className="flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
          style={{ height }}
        >
          {translate("chelone.map.no_geometry", { _: "No geometry" })}
        </div>
      )}
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </FieldSet>
  );
}
