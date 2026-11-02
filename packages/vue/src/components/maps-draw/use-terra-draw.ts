import {
  editorStyles,
  fromEditorFeatures,
  type GeoFeature,
  type ShapeStyle,
  toEditorFeatures,
} from "@chelone/core";
import {
  TerraDraw,
  TerraDrawCircleMode,
  TerraDrawLineStringMode,
  TerraDrawPointMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  type Ref,
  ref,
  shallowRef,
  toRaw,
  watch,
} from "vue";
import { useMap } from "../maps/use-map";

/** A toolbar button that switches the editor's mode. */
export type DrawTool =
  | "draw-point"
  | "draw-line"
  | "draw-polygon"
  | "draw-rectangle"
  | "draw-circle"
  | "edit"
  | "move";

const TOOL_MODES: Record<DrawTool, string> = {
  "draw-point": "point",
  "draw-line": "linestring",
  "draw-polygon": "polygon",
  "draw-rectangle": "rectangle",
  "draw-circle": "circle",
  edit: "select",
  move: "select-move",
};

/** The Terra Draw mode a tool switches on. No tool, or `disabled`, is `render`. */
export function toolMode(
  tool: DrawTool | null | undefined,
  disabled = false,
): string {
  return !tool || disabled ? "render" : TOOL_MODES[tool];
}

/** What the user did on the map: drew a shape, changed one, or removed one. */
export interface TerraDrawEdit {
  type: "draw" | "edit" | "delete";
  /** The user's features after the edit. */
  features: GeoFeature[];
}

export interface UseTerraDrawOptions {
  /**
   * A getter for what to show: the features, the active tool and whether the
   * editor is read-only. The editor takes a new array of features when it
   * differs from its own, and switches mode when the tool or `disabled` changes.
   */
  state: () => {
    features: GeoFeature[];
    /** The active tool. Defaults to none. */
    tool?: DrawTool | null;
    /** Switches to the `render` mode, which shows the features and edits nothing. */
    disabled?: boolean;
  };
  /** Snap to existing coordinates and lines. Read once. Defaults to true. */
  snappable?: boolean;
  /** Pixels within which the pointer grabs a vertex or snaps. Read once. Defaults to 20. */
  snapDistance?: number;
  /** Read once. */
  shapeStyle?: ShapeStyle;
  /** Called when a drawing or an edit finishes and when a feature is removed, never during a drag. */
  onEdit?: (edit: TerraDrawEdit) => void;
}

export interface UseTerraDrawResult {
  /** The id of the selected feature, or `null`. */
  selectedId: Readonly<Ref<string | number | null>>;
  /** Removes the selected feature, which calls `onEdit` with type `delete`. */
  deleteSelected: () => void;
  /**
   * The features the editor refused (Terra Draw rejects coordinates with more
   * than 9 decimals and shapes its mode finds invalid). They are not in the
   * editor, so show them read-only; `onEdit` features still include them.
   */
  rejected: Readonly<Ref<GeoFeature[]>>;
}

type SelectFlags = Record<string, { feature: Record<string, unknown> }>;

/** The select modes name their flags by the `mode` property of the feature. */
function selectFlags(kind: "edit" | "move", snappable: boolean): SelectFlags {
  const area = {
    feature:
      kind === "edit"
        ? {
            draggable: false,
            rotateable: true,
            coordinates: {
              midpoints: true,
              draggable: true,
              deletable: true,
              snappable,
            },
          }
        : { draggable: true, rotateable: true },
  };
  return {
    // A point has one coordinate: dragging the feature is the edit.
    point: { feature: { draggable: true } },
    linestring: area,
    polygon: area,
    rectangle: area,
    circle: area,
  };
}

function buildModes(
  snappable: boolean,
  pointerDistance: number,
  shapeStyle: ShapeStyle,
) {
  const styles = editorStyles(shapeStyle);
  const snapping = snappable ? { toCoordinate: true, toLine: true } : undefined;
  // The editor types a style as a hex string; `ShapeStyle` takes any CSS color.
  const asStyles = (value: Record<string, string | number>) => value as never;
  return [
    new TerraDrawPointMode({
      modeName: "point",
      pointerDistance,
      styles: asStyles(styles.point),
    }),
    new TerraDrawLineStringMode({
      modeName: "linestring",
      pointerDistance,
      snapping,
      styles: asStyles(styles.linestring),
    }),
    new TerraDrawPolygonMode({
      modeName: "polygon",
      pointerDistance,
      snapping,
      styles: asStyles(styles.polygon),
    }),
    new TerraDrawRectangleMode({
      modeName: "rectangle",
      pointerDistance,
      styles: asStyles(styles.rectangle),
    }),
    new TerraDrawCircleMode({
      modeName: "circle",
      pointerDistance,
      styles: asStyles(styles.circle),
    }),
    new TerraDrawSelectMode({
      modeName: "select",
      pointerDistance,
      flags: selectFlags("edit", snappable),
      styles: asStyles(styles.select),
    }),
    new TerraDrawSelectMode({
      modeName: "select-move",
      pointerDistance,
      flags: selectFlags("move", snappable),
      styles: asStyles(styles.select),
    }),
    new TerraDrawRenderMode({
      modeName: "render",
      styles: asStyles(styles.render),
    }),
  ];
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left).filter((key) => left[key] !== undefined);
  const other = Object.keys(right).filter((key) => right[key] !== undefined);
  return (
    keys.length === other.length &&
    keys.every((key) => sameValue(left[key], right[key]))
  );
}

type Snapshot = ReturnType<TerraDraw["getSnapshot"]>;

/** The ids of the user's features in a snapshot, helper features left out. */
function userIds(snapshot: Snapshot): Set<string | number> {
  const ids = new Set<string | number>();
  for (const entry of snapshot) {
    if (entry.id != null && fromEditorFeatures([entry]).length > 0) {
      ids.add(entry.id);
    }
  }
  return ids;
}

/**
 * Runs one Terra Draw editor on the surrounding `MapCanvas` and keeps it equal
 * to `state().features`. The caller owns the data: the editor only shows the
 * features and proposes edits through `onEdit`.
 *
 * Modes, snapping and styles are read once, when the editor is built: change
 * `key` to rebuild. Terra Draw moves and restores the map's drag pan itself
 * during its own drags, so nothing here touches `map.dragPan`. A selected line
 * or polygon rotates with Terra Draw's key chord, `Control` and `r`.
 *
 * Call it in the setup of a component rendered inside a `MapCanvas`. Needs the
 * optional `terra-draw` and `terra-draw-maplibre-gl-adapter` peers.
 */
export function useTerraDraw(options: UseTerraDrawOptions): UseTerraDrawResult {
  const map = useMap();
  const draw = shallowRef<TerraDraw | null>(null);
  const selectedId = ref<string | number | null>(null);
  const rejected = shallowRef<GeoFeature[]>([]);
  // True while this hook changes the store itself, so those events write nothing.
  let syncing = false;
  // The editor ids of the user's features as of the last sync or edit. Only the
  // removal of one of them is the user's: the editor deletes its own helper
  // features, and a half-drawn one, while it draws, selects and drags.
  let knownIds = new Set<string | number>();

  // Computeds, so each watcher wakes only for what it reads.
  const features = computed(() => options.state().features);
  const mode = computed(() => {
    const { tool, disabled } = options.state();
    return toolMode(tool, disabled);
  });

  let instance: TerraDraw | null = null;
  let active = false;

  onMounted(() => {
    const built = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: buildModes(
        options.snappable ?? true,
        options.snapDistance ?? 20,
        options.shapeStyle ?? {},
      ),
    });
    instance = built;
    active = true;

    const report = (type: TerraDrawEdit["type"]) => {
      const snapshot = built.getSnapshot();
      knownIds = userIds(snapshot);
      // The refused features are not in the store but still belong to the value.
      options.onEdit?.({
        type,
        features: [...fromEditorFeatures(snapshot), ...rejected.value],
      });
    };

    built.on("ready", () => {
      if (active) draw.value = built;
    });
    built.on("finish", (_id, context) => {
      if (!active || syncing) return;
      report(context.action === "draw" ? "draw" : "edit");
    });
    built.on("change", (ids, type) => {
      if (!active || syncing || type !== "delete") return;
      // A finishing drawing deletes its closing and snapping points before it
      // fires `finish`, which reports the edit: only a removed user feature
      // is a delete.
      if (!ids.some((id) => knownIds.has(id))) return;
      report("delete");
    });
    built.on("select", (id) => {
      if (active) selectedId.value = id;
    });
    built.on("deselect", (id) => {
      if (active && selectedId.value === id) selectedId.value = null;
    });
    built.start();
  });

  onBeforeUnmount(() => {
    active = false;
    draw.value = null;
    selectedId.value = null;
    rejected.value = [];
    // The canvas can remove the map first, and the adapter throws on a removed one.
    try {
      instance?.stop();
    } catch {}
    instance = null;
  });

  watch(
    [draw, features],
    ([current, next]) => {
      if (!current) return;
      const snapshot = current.getSnapshot();
      knownIds = userIds(snapshot);
      // The caller's array may be reactive; the editor clones what it is given.
      const wanted = toRaw(next);
      const editable = wanted.filter(
        (feature) => !rejected.value.some((r) => sameValue(r, feature)),
      );
      if (sameValue(fromEditorFeatures(snapshot), editable)) return;
      syncing = true;
      try {
        current.clear();
        const editorFeatures = toEditorFeatures(wanted, () =>
          current.getFeatureId(),
        );
        const results = current.addFeatures(editorFeatures as never);
        // `toEditorFeatures` can split or drop features, so match the results
        // to what the editor holds: a refused feature is one that is absent.
        const held = fromEditorFeatures(current.getSnapshot());
        rejected.value = results.every((result) => result.valid)
          ? []
          : wanted.filter(
              (feature) => !held.some((h) => sameValue(h, feature)),
            );
      } finally {
        syncing = false;
      }
      knownIds = userIds(current.getSnapshot());
      selectedId.value = null;
    },
    { immediate: true },
  );

  watch(
    [draw, mode],
    ([current, next]) => {
      current?.setMode(next);
    },
    { immediate: true },
  );

  function deleteSelected() {
    const current = draw.value;
    if (current && selectedId.value !== null) {
      current.removeFeatures([selectedId.value]);
    }
  }

  return { selectedId, deleteSelected, rejected };
}
