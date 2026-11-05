import {
  editorStyles,
  fromEditorFeatures,
  type ShapeStyle,
  toEditorFeatures,
} from "@chelone/core";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useMap } from "../maps/map-canvas";
import type { DrawFeature } from "./geometry-ops";

/** A toolbar button that switches the editor's mode. */
export type DrawTool =
  | "draw-point"
  | "draw-line"
  | "draw-polygon"
  | "draw-rectangle"
  | "draw-circle"
  | "cut"
  | "edit"
  | "move";

const TOOL_MODES: Record<DrawTool, string> = {
  "draw-point": "point",
  "draw-line": "linestring",
  "draw-polygon": "polygon",
  "draw-rectangle": "rectangle",
  "draw-circle": "circle",
  // Draws like a polygon; the finished drawing is a cutter, not a feature.
  cut: "polygon",
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
export type TerraDrawEdit =
  | {
      type: "draw" | "edit" | "delete";
      /** The user's features after the edit. */
      features: DrawFeature[];
    }
  | {
      /** A polygon finished while the `cut` tool was active. */
      type: "cut";
      /** The user's features without the cutter. */
      features: DrawFeature[];
      /** The finished polygon, which the editor no longer holds. */
      cutter: DrawFeature;
    };

export interface UseTerraDrawOptions {
  /** The features to show and edit. The editor takes a new array when it differs from its own. */
  features: DrawFeature[];
  /** The active tool. Defaults to none. */
  tool?: DrawTool | null;
  /** Switches to the `render` mode, which shows the features and edits nothing. */
  disabled?: boolean;
  /** Snap to existing coordinates and lines. Read once. Defaults to true. */
  snappable?: boolean;
  /** Pixels within which the pointer grabs a vertex or snaps; every mode's `pointerDistance`. Read once. Defaults to 20. */
  snapDistance?: number;
  /** Read once. */
  shapeStyle?: ShapeStyle;
  /** Called when a drawing or an edit finishes and when a feature is removed, never during a drag. The latest function is used. */
  onEdit?: (edit: TerraDrawEdit) => void;
}

export interface UseTerraDrawResult {
  /** The id of the selected feature, or `null`. */
  selectedId: string | number | null;
  /** Removes the selected feature, which calls `onEdit` with type `delete`. Changes with the selection. */
  deleteSelected: () => void;
  /**
   * The entries of `features` the editor refused, as given. They are not drawn
   * and not in any `onEdit`: a caller that keeps them in its value adds them back.
   */
  refused: DrawFeature[];
}

const NONE_REFUSED: DrawFeature[] = [];

type SelectFlags = NonNullable<
  NonNullable<ConstructorParameters<typeof TerraDrawSelectMode>[0]>["flags"]
>;

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
  return [
    new TerraDrawPointMode({
      modeName: "point",
      pointerDistance,
      styles: styles.point,
    }),
    new TerraDrawLineStringMode({
      modeName: "linestring",
      pointerDistance,
      snapping,
      styles: styles.linestring,
    }),
    new TerraDrawPolygonMode({
      modeName: "polygon",
      pointerDistance,
      snapping,
      styles: styles.polygon,
    }),
    new TerraDrawRectangleMode({
      modeName: "rectangle",
      pointerDistance,
      styles: styles.rectangle,
    }),
    new TerraDrawCircleMode({
      modeName: "circle",
      pointerDistance,
      styles: styles.circle,
    }),
    new TerraDrawSelectMode({
      modeName: "select",
      pointerDistance,
      flags: selectFlags("edit", snappable),
      styles: styles.select,
    }),
    new TerraDrawSelectMode({
      modeName: "select-move",
      pointerDistance,
      flags: selectFlags("move", snappable),
      styles: styles.select,
    }),
    new TerraDrawRenderMode({
      modeName: "render",
      styles: styles.render,
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
 * to `features`. The caller owns the data: the editor only shows `features` and
 * proposes edits through `onEdit`.
 *
 * Modes, snapping and styles are read once, when the editor is built: change
 * `key` to rebuild. Terra Draw moves and restores the map's drag pan itself
 * during its own drags, so nothing here touches `map.dragPan`. A selected line
 * or polygon rotates with Terra Draw's key chord, `Control` and `r`.
 *
 * Needs the optional `terra-draw` and `terra-draw-maplibre-gl-adapter` peers.
 */
export function useTerraDraw({
  features,
  tool = null,
  disabled = false,
  snappable = true,
  snapDistance = 20,
  shapeStyle,
  onEdit,
}: UseTerraDrawOptions): UseTerraDrawResult {
  const map = useMap();
  const [draw, setDraw] = useState<TerraDraw | null>(null);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [refused, setRefused] = useState<DrawFeature[]>(NONE_REFUSED);
  // The same list as `refused`, for the sync to read without rerunning.
  const refusedRef = useRef<DrawFeature[]>(NONE_REFUSED);
  const latest = useRef({
    snappable,
    snapDistance,
    shapeStyle,
    tool,
    onEdit,
  });
  latest.current = { snappable, snapDistance, shapeStyle, tool, onEdit };
  // True while this hook changes the store itself, so those events write nothing.
  const syncing = useRef(false);
  // The editor ids of the user's features as of the last sync or edit. Only the
  // removal of one of them is the user's: the editor deletes its own helper
  // features, and a half-drawn one, while it draws, selects and drags.
  const knownIds = useRef<Set<string | number>>(new Set());

  useEffect(() => {
    const now = latest.current;
    const instance = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map }),
      modes: buildModes(now.snappable, now.snapDistance, now.shapeStyle ?? {}),
    });
    let active = true;

    const report = (type: "draw" | "edit" | "delete") => {
      const snapshot = instance.getSnapshot();
      knownIds.current = userIds(snapshot);
      latest.current.onEdit?.({
        type,
        features: fromEditorFeatures(snapshot),
      });
    };

    instance.on("ready", () => {
      if (active) setDraw(instance);
    });
    // A cut drawing is reported as a cutter and leaves the store at once: when
    // the cut changes nothing, the features stay equal and no sync would.
    const reportCut = (id: string | number) => {
      const snapshot = instance.getSnapshot();
      const [cutter] = fromEditorFeatures(snapshot.filter((e) => e.id === id));
      const rest = snapshot.filter((e) => e.id !== id);
      syncing.current = true;
      try {
        instance.removeFeatures([id]);
      } finally {
        syncing.current = false;
      }
      knownIds.current = userIds(rest);
      if (!cutter) return;
      latest.current.onEdit?.({
        type: "cut",
        features: fromEditorFeatures(rest),
        cutter,
      });
    };

    instance.on("finish", (id, context) => {
      if (!active || syncing.current) return;
      if (context.action === "draw" && latest.current.tool === "cut") {
        reportCut(id);
        return;
      }
      report(context.action === "draw" ? "draw" : "edit");
    });
    instance.on("change", (ids, type) => {
      if (!active || syncing.current || type !== "delete") return;
      // A finishing drawing deletes its closing and snapping points before it
      // fires `finish`, which reports the edit: only a removed user feature
      // is a delete.
      if (!ids.some((id) => knownIds.current.has(id))) return;
      report("delete");
    });
    instance.on("select", (id) => {
      if (active) setSelectedId(id);
    });
    instance.on("deselect", (id) => {
      if (!active) return;
      setSelectedId((current) => (current === id ? null : current));
    });
    instance.start();

    return () => {
      active = false;
      setDraw(null);
      setSelectedId(null);
      refusedRef.current = NONE_REFUSED;
      setRefused(NONE_REFUSED);
      // The canvas can remove the map first, and the adapter throws on a removed one.
      try {
        instance.stop();
      } catch {}
    };
  }, [map]);

  useEffect(() => {
    if (!draw) return;
    const snapshot = draw.getSnapshot();
    knownIds.current = userIds(snapshot);
    // A refused entry is never in the snapshot: leave it out of the comparison,
    // but only while `features` still holds it.
    const stillRefused = refusedRef.current.filter((entry) =>
      features.some((feature) => sameValue(feature, entry)),
    );
    const drawn = features.filter(
      (feature) => !stillRefused.some((entry) => sameValue(feature, entry)),
    );
    if (
      stillRefused.length === refusedRef.current.length &&
      sameValue(fromEditorFeatures(snapshot), drawn)
    ) {
      return;
    }
    // One editor feature per entry, or none where core cannot hold the entry.
    const sent = features.flatMap((feature) => {
      const editor = toEditorFeatures([feature], () => draw.getFeatureId())[0];
      return editor ? [{ feature, editor }] : [];
    });
    const refusedNow: DrawFeature[] = [];
    syncing.current = true;
    try {
      draw.clear();
      const answers = draw.addFeatures(sent.map((pair) => pair.editor));
      answers.forEach((answer, i) => {
        const pair = sent[i];
        if (!answer.valid && pair) refusedNow.push(pair.feature);
      });
    } finally {
      syncing.current = false;
    }
    knownIds.current = userIds(draw.getSnapshot());
    refusedRef.current = refusedNow.length ? refusedNow : NONE_REFUSED;
    setRefused(refusedRef.current);
    setSelectedId(null);
  }, [draw, features]);

  useEffect(() => {
    draw?.setMode(toolMode(tool, disabled));
  }, [draw, tool, disabled]);

  const deleteSelected = useCallback(() => {
    if (draw && selectedId !== null) draw.removeFeatures([selectedId]);
  }, [draw, selectedId]);

  return { selectedId, deleteSelected, refused };
}
