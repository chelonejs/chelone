import {
  featuresToShape,
  type GeoFeature,
  geoBounds,
  heldFeatures,
  type MapStyleInput,
  maxVertices,
  minAreaM2,
  minVertices,
  noSelfIntersection,
  type ShapeStyle,
  type ShapeValue,
  type ShapeValueKind,
  shapeToFeatures,
  type Validator,
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
import { cn } from "@/lib/utils";
import { ValidationError } from "../../field-error-display";
import { useInput } from "../../form-hooks";
import { useGeoJsonSource } from "../maps/geo-json-field";
import { MapCanvas, useMap } from "../maps/map-canvas";
import { DrawToolbar } from "./draw-toolbar";
import { cutFeatures } from "./geometry-ops";
import {
  type DrawTool,
  type TerraDrawEdit,
  type UseTerraDrawResult,
  useTerraDraw,
} from "./use-terra-draw";

type ToolbarTool = DrawTool | "delete";

export interface ShapeInputProps {
  /** The form field holding the GeoJSON value. */
  source: string;
  /** The kind of value the field holds, which decides what a drawing writes. */
  kind: ShapeValueKind;
  /** The legend. A string is translated; `false` renders none. */
  label?: ReactNode | false;
  helperText?: ReactNode | false;
  /** Runs after the limits below. */
  validate?: Validator | readonly Validator[];
  /** Fewest vertices the shape may have; a polygon ring counts its distinct vertices. The shape is stored as drawn and the field is flagged. */
  minVertices?: number;
  /** Most vertices the shape may have. */
  maxVertices?: number;
  /** Smallest area in square metres a polygon may cover. */
  minAreaM2?: number;
  /** Set to false to flag a shape that crosses itself. Defaults to true, which checks nothing. */
  allowSelfIntersection?: boolean;
  /** The toolbar buttons, in order. Defaults to the tools that suit `kind`. */
  tools?: readonly ToolbarTool[];
  /** Snap to existing coordinates and lines. Read once. Defaults to true. */
  snappable?: boolean;
  /** Pixels within which the pointer grabs a vertex or snaps. Read once. Defaults to 20. */
  snapDistance?: number;
  /** Shows the shape and hides the toolbar; pan and zoom still work. */
  disabled?: boolean;
  /** `[lat, lng]`. The map centre while the field is empty. Defaults to `[0, 0]`. */
  defaultCenter?: readonly [lat: number, lng: number];
  /** Read once at mount. Defaults to 13. */
  zoom?: number;
  /** In pixels, or any CSS length. Defaults to 300. */
  height?: number | string;
  /** Defaults to the style from `MapsProvider`. */
  mapStyle?: MapStyleInput;
  /** Partial over `DEFAULT_SHAPE_STYLE`. Read once. */
  shapeStyle?: ShapeStyle;
  /**
   * Width over height of a `BBox` value. The stored box grows around its centre
   * to this ratio and never shrinks, and the rectangle on the map follows it.
   */
  aspectRatio?: number;
  /** Frame the first value on the map. The user's own edits never refit. Defaults to true. */
  fitBounds?: boolean;
  /** Called with the stored value after each drawing or edit has been written to the form. */
  onCommit?: (value: ShapeValue | null) => void;
  className?: string;
}

const AREA_TOOLS: ToolbarTool[] = [
  "draw-polygon",
  "draw-rectangle",
  "draw-circle",
  "cut",
  "edit",
  "move",
  "delete",
];

/** The tools that make sense for what a field of `kind` holds. */
function defaultTools(kind: ShapeValueKind): readonly ToolbarTool[] {
  switch (kind) {
    case "Point":
    case "MultiPoint":
      return ["draw-point", "move", "delete"];
    case "LineString":
    case "MultiLineString":
      return ["draw-line", "edit", "move", "delete"];
    case "Polygon":
    case "MultiPolygon":
      return AREA_TOOLS;
    case "BBox":
      return ["draw-rectangle", "edit", "move", "delete"];
    default:
      return ["draw-point", "draw-line", ...AREA_TOOLS];
  }
}

interface EditorProps {
  features: GeoFeature[];
  held: GeoFeature[];
  tool: DrawTool | null;
  disabled: boolean;
  snappable: boolean;
  snapDistance: number;
  shapeStyle: ShapeStyle | undefined;
  onEdit: (edit: TerraDrawEdit) => void;
  onControls: (controls: UseTerraDrawResult | null) => void;
}

/** Everything that needs the map: the Terra Draw editor and the read-only held parts. */
function Editor({
  features,
  held,
  tool,
  disabled,
  snappable,
  snapDistance,
  shapeStyle,
  onEdit,
  onControls,
}: EditorProps) {
  const map = useMap();
  const heldId = `shape-input-held-${useId()}`;
  const heldData = useMemo(
    () => ({ type: "FeatureCollection" as const, features: held }),
    [held],
  );
  useGeoJsonSource(map, heldId, heldData, shapeStyle ?? {});

  const { selectedId, deleteSelected } = useTerraDraw({
    features,
    tool,
    disabled,
    snappable,
    snapDistance,
    shapeStyle,
    onEdit,
  });
  useEffect(() => {
    onControls({ selectedId, deleteSelected });
  }, [selectedId, deleteSelected, onControls]);
  useEffect(() => () => onControls(null), [onControls]);
  return null;
}

/** Frames the shape once, unless the first shape is one the user drew. */
function FitToShape({
  features,
  held,
  value,
  written,
}: {
  features: GeoFeature[];
  held: GeoFeature[];
  value: unknown;
  written: React.RefObject<unknown>;
}) {
  const map = useMap();
  const fitted = useRef(false);
  const box = useMemo(
    () =>
      geoBounds({
        type: "FeatureCollection",
        features: [...features, ...held],
      }),
    [features, held],
  );
  useEffect(() => {
    if (fitted.current || !box) return;
    fitted.current = true;
    if (value === written.current) return;
    map.fitBounds(box, { padding: 20, maxZoom: 18, duration: 0 });
  }, [map, box, value, written]);
  return null;
}

const NO_CONTROLS: UseTerraDrawResult = {
  selectedId: null,
  deleteSelected: () => {},
};

/**
 * Edits a GeoJSON value in a form field by drawing on a map. The field is the
 * only copy of the value: the map editor shows it and proposes edits, and each
 * finished drawing, vertex drag, move or removal is written to the field. Parts
 * the editor cannot hold (a Polygon with holes, a Multi geometry inside a
 * collection) show read-only and stay in the value.
 *
 * Needs the optional `maplibre-gl`, `terra-draw` and
 * `terra-draw-maplibre-gl-adapter` peers.
 *
 * @example
 * <ShapeInput source="area" kind="Polygon" label="Area" />
 */
export function ShapeInput({
  source,
  kind,
  label,
  helperText,
  validate,
  minVertices: minVerticesLimit,
  maxVertices: maxVerticesLimit,
  minAreaM2: minAreaLimit,
  allowSelfIntersection = true,
  tools,
  snappable = true,
  snapDistance = 20,
  disabled = false,
  defaultCenter = [0, 0],
  zoom = 13,
  height = 300,
  mapStyle,
  shapeStyle,
  aspectRatio,
  fitBounds = true,
  onCommit,
  className,
}: ShapeInputProps) {
  // The limits run before the caller's validators.
  const validators = useMemo(
    () => [
      ...(minVerticesLimit === undefined
        ? []
        : [minVertices(minVerticesLimit)]),
      ...(maxVerticesLimit === undefined
        ? []
        : [maxVertices(maxVerticesLimit)]),
      ...(minAreaLimit === undefined ? [] : [minAreaM2(minAreaLimit)]),
      ...(allowSelfIntersection ? [] : [noSelfIntersection()]),
      ...(Array.isArray(validate) ? validate : validate ? [validate] : []),
    ],
    [
      minVerticesLimit,
      maxVerticesLimit,
      minAreaLimit,
      allowSelfIntersection,
      validate,
    ],
  );
  const { field, fieldState, isRequired } = useInput({
    source,
    validate: validators,
    format: (v: unknown) => v ?? null,
  });
  const invalid = fieldState.invalid;
  const error = fieldState.error;

  const draft = useMemo(
    () => shapeToFeatures(kind, field.value),
    [kind, field.value],
  );
  const held = useMemo(
    () => heldFeatures(kind, field.value),
    [kind, field.value],
  );

  const [tool, setTool] = useState<DrawTool | null>(null);
  const [controls, setControls] = useState<UseTerraDrawResult | null>(null);
  // What the last edit wrote, so the first shape the user draws is not framed.
  const written = useRef<unknown>(undefined);
  const latest = useRef({ field, kind, aspectRatio, onCommit });
  latest.current = { field, kind, aspectRatio, onCommit };

  const onEdit = (edit: TerraDrawEdit) => {
    const now = latest.current;
    let features = edit.features;
    if (edit.type === "cut") {
      // The tool clears either way; a cut that touched nothing commits nothing.
      setTool(null);
      const cut = cutFeatures(features, edit.cutter);
      if (!cut.changed) return;
      features = cut.features;
    }
    const next = featuresToShape(now.kind, features, now.field.value, {
      aspectRatio: now.aspectRatio,
    });
    written.current = next;
    now.field.onChange(next);
    now.field.onBlur();
    if (edit.type === "draw") setTool(null);
    now.onCommit?.(next);
  };

  const { selectedId, deleteSelected } = controls ?? NO_CONTROLS;

  return (
    <FieldSet
      data-slot="shape-input"
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
      {disabled ? null : (
        <DrawToolbar
          tools={tools ?? defaultTools(kind)}
          active={tool}
          onChange={setTool}
          onDelete={deleteSelected}
          canDelete={selectedId !== null}
        />
      )}
      <MapCanvas
        center={defaultCenter}
        zoom={zoom}
        height={height}
        mapStyle={mapStyle}
      >
        <Editor
          features={draft}
          held={held}
          tool={tool}
          disabled={disabled}
          snappable={snappable}
          snapDistance={snapDistance}
          shapeStyle={shapeStyle}
          onEdit={onEdit}
          onControls={setControls}
        />
        {fitBounds ? (
          <FitToShape
            features={draft}
            held={held}
            value={field.value}
            written={written}
          />
        ) : null}
      </MapCanvas>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </FieldSet>
  );
}
