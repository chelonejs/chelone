import {
  featuresToShape,
  type GeoFeature,
  geoBounds,
  heldFeatures,
  type MapStyleInput,
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
  validate?: Validator | readonly Validator[];
  /** The toolbar buttons, in order. Defaults to the tools that suit `kind`. */
  tools?: readonly ToolbarTool[];
  /** Snap to existing coordinates and lines. Read once. Defaults to true. */
  snappable?: boolean;
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
  tools,
  snappable = true,
  disabled = false,
  defaultCenter = [0, 0],
  zoom = 13,
  height = 300,
  mapStyle,
  shapeStyle,
  fitBounds = true,
  onCommit,
  className,
}: ShapeInputProps) {
  const { field, fieldState, isRequired } = useInput({
    source,
    validate,
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
  const latest = useRef({ field, kind, onCommit });
  latest.current = { field, kind, onCommit };

  const onEdit = (edit: TerraDrawEdit) => {
    const now = latest.current;
    const next = featuresToShape(now.kind, edit.features, now.field.value);
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
