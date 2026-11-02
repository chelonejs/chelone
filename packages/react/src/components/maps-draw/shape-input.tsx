import {
  featuresToShape,
  type GeoFeature,
  geoBounds,
  heldFeatures,
  isLngLatBox,
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
import { useCheloneNotifications } from "../../context";
import { ValidationError } from "../../field-error-display";
import { useInput } from "../../form-hooks";
import { useTranslate } from "../../i18n-hooks";
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
  /** Called with the stored value after each drawing or edit has been written to the form, and again after `refine` writes a changed one. */
  onCommit?: (value: ShapeValue | null) => void;
  /**
   * Adjusts the value after the user's own drawing or edit, such as snapping a
   * line to roads. It runs once the edit is in the form, never on load or
   * reset, and a newer edit or an unmount aborts `signal`. A result that is
   * not null and differs is written, unless the field changed meanwhile. A
   * thrown error keeps the value as drawn. A null result is "nothing to
   * change" unless `refineFailedMessage` is set, which a throw also notifies.
   */
  refine?: (
    value: ShapeValue,
    options: { signal: AbortSignal },
  ) => Promise<ShapeValue | null> | ShapeValue | null;
  /**
   * Message key notified as a warning when `refine` resolves to null or throws
   * (an abort excepted), and the value is kept as drawn. `LineStringInput` sets it for
   * `snapToRoads`.
   */
  refineFailedMessage?: string;
  className?: string;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every((key) =>
    sameValue(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    ),
  );
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

/** The kinds whose value keeps every feature, not just the last one drawn. */
const HOLDS_MANY: ReadonlySet<ShapeValueKind> = new Set([
  "MultiPoint",
  "MultiLineString",
  "MultiPolygon",
  "GeometryCollection",
  "FeatureCollection",
]);

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

  const { selectedId, deleteSelected, refused } = useTerraDraw({
    features,
    tool,
    disabled,
    snappable,
    snapDistance,
    shapeStyle,
    onEdit,
  });
  useEffect(() => {
    onControls({ selectedId, deleteSelected, refused });
  }, [selectedId, deleteSelected, refused, onControls]);
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
    if (fitted.current || !isLngLatBox(box)) return;
    fitted.current = true;
    if (value === written.current) return;
    map.fitBounds(box, { padding: 20, maxZoom: 18, duration: 0 });
  }, [map, box, value, written]);
  return null;
}

const NO_CONTROLS: UseTerraDrawResult = {
  selectedId: null,
  deleteSelected: () => {},
  refused: [],
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
  refine,
  refineFailedMessage,
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
  const translate = useTranslate();
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
  const controlsRef = useRef(controls);
  controlsRef.current = controls;
  // What the last edit wrote, so the first shape the user draws is not framed.
  const written = useRef<unknown>(undefined);
  const notifications = useCheloneNotifications();
  const latest = useRef({
    field,
    kind,
    aspectRatio,
    onCommit,
    refine,
    refineFailedMessage,
    notifications,
  });
  latest.current = {
    field,
    kind,
    aspectRatio,
    onCommit,
    refine,
    refineFailedMessage,
    notifications,
  };
  const refining = useRef<AbortController | null>(null);
  useEffect(() => () => refining.current?.abort(), []);

  const runRefine = async (committed: ShapeValue) => {
    const refineValue = latest.current.refine;
    if (!refineValue) return;
    const abort = new AbortController();
    refining.current = abort;
    const warnFailed = () => {
      const now = latest.current;
      if (now.refineFailedMessage) {
        now.notifications?.notify(now.refineFailedMessage, { type: "warning" });
      }
    };
    let result: ShapeValue | null;
    try {
      result = await refineValue(committed, { signal: abort.signal });
    } catch {
      // A failed refinement keeps the value as the user drew it.
      if (!abort.signal.aborted) warnFailed();
      return;
    }
    if (abort.signal.aborted) return;
    if (result === null) {
      warnFailed();
      return;
    }
    const now = latest.current;
    // Only an untouched field takes the result: anything else was edited since.
    if (now.field.value !== committed || sameValue(result, committed)) return;
    written.current = result;
    now.field.onChange(result);
    now.field.onBlur();
    now.onCommit?.(result);
  };

  const onEdit = (edit: TerraDrawEdit) => {
    const now = latest.current;
    // A newer edit makes any pending refinement stale, whatever the edit is.
    refining.current?.abort();
    // A part the editor refused is not in the edit: it stays in the value, as
    // the held parts do. A single-shape value takes the new drawing instead.
    const refused = HOLDS_MANY.has(now.kind)
      ? (controlsRef.current?.refused ?? [])
      : [];
    let features = [...edit.features, ...refused];
    let prev = now.field.value;
    if (edit.type === "cut") {
      // The tool clears either way; a cut that touched nothing commits nothing.
      setTool(null);
      // The editor holds no polygon with a hole, so the held parts are cut too.
      // The result then holds every part, and no held part is added back.
      const cut = cutFeatures(
        [...features, ...heldFeatures(now.kind, prev)],
        edit.cutter,
      );
      if (!cut.changed) return;
      // A single-shape value stores the last feature: a split would lose the rest.
      if (!HOLDS_MANY.has(now.kind) && cut.features.length > 1) return;
      features = cut.features;
      if (HOLDS_MANY.has(now.kind)) prev = null;
    }
    const next = featuresToShape(now.kind, features, prev, {
      aspectRatio: now.aspectRatio,
    });
    written.current = next;
    now.field.onChange(next);
    now.field.onBlur();
    if (edit.type === "draw") setTool(null);
    now.onCommit?.(next);
    if (next !== null) void runRefine(next);
  };

  const { selectedId, deleteSelected, refused } = controls ?? NO_CONTROLS;

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
      {refused.length > 0 ? (
        <p
          data-slot="shape-input-warning"
          className="text-sm text-amber-600 dark:text-amber-500"
        >
          {translate("chelone.map.shape_not_shown", {
            _: "Part of this shape cannot be shown on the map",
          })}
        </p>
      ) : null}
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </FieldSet>
  );
}
