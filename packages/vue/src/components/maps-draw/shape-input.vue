<script lang="ts">
import {
  geoBounds,
  isLngLatBox,
  type MapStyleInput,
  maxVertices,
  minAreaM2,
  minVertices,
  noSelfIntersection,
  type ShapeStyle,
  type ShapeValue,
  type ShapeValueKind,
  type SourceProp,
  type Validator,
} from "@chelone/core";
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  toRaw,
  watch,
} from "vue";
import {
  uniqueGeoJsonSourceId,
  useGeoJsonSource,
} from "../maps/use-geo-json-source";
import { useMap } from "../maps/use-map";
import {
  type DrawTool,
  type TerraDrawEdit,
  type UseTerraDrawResult,
  useTerraDraw,
} from "./use-terra-draw";

type ToolbarTool = DrawTool | "delete";

/** Props for {@link ShapeInput}. */
export interface ShapeInputProps {
  /** The form field holding the GeoJSON value. */
  source: SourceProp;
  /** The kind of value the field holds, which decides what a drawing writes. */
  kind: ShapeValueKind;
  /** The legend. A string is translated; `false` renders none. */
  label?: string | false;
  helperText?: string | false;
  /** Runs after the limits below. Read once. */
  validate?: Validator | readonly Validator[];
  /** Fewest vertices the shape may have; a polygon ring counts its distinct vertices. The shape is stored as drawn and the field is flagged. Read once. */
  minVertices?: number;
  /** Most vertices the shape may have. Read once. */
  maxVertices?: number;
  /** Smallest area in square metres a polygon may cover. Read once. */
  minAreaM2?: number;
  /** Set to false to flag a shape that crosses itself. Defaults to true, which checks nothing. Read once. */
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
  /**
   * Adjusts the value after the user's own drawing or edit, such as snapping a
   * line to roads. It runs once the edit is in the form, never on load or
   * reset, and a newer edit or an unmount aborts `signal`. A result that is
   * not null and differs is written, unless the field changed meanwhile. A
   * thrown error keeps the value as drawn.
   */
  refine?: (
    value: ShapeValue,
    options: { signal: AbortSignal },
  ) => Promise<ShapeValue | null> | ShapeValue | null;
  class?: string;
}

/** What the last edit wrote, so the first shape the user draws is not framed. */
interface Written {
  current: unknown;
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

/** The kinds whose value keeps every feature, not just the last one drawn. */
const HOLDS_MANY: ReadonlySet<ShapeValueKind> = new Set([
  "MultiPoint",
  "MultiLineString",
  "MultiPolygon",
  "GeometryCollection",
  "FeatureCollection",
]);

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

/**
 * Lives in the `MapCanvas` slot, where `useMap()` works. Runs the Terra Draw
 * editor, draws the read-only held parts, frames the first shape once, and
 * hands the selection controls up to the toolbar.
 */
const Editor = defineComponent(
  (
    props: {
      features: DrawFeature[];
      held: DrawFeature[];
      tool?: DrawTool | null;
      disabled?: boolean;
      snappable?: boolean;
      snapDistance?: number;
      shapeStyle?: ShapeStyle;
      fit?: boolean;
      /** The field's current value, whatever it holds. */
      getValue: () => unknown;
      written: Written;
    },
    { emit },
  ) => {
    const map = useMap();

    // MapLibre structured-clones what it is given, which throws on a reactive proxy.
    useGeoJsonSource(
      uniqueGeoJsonSourceId(),
      () => ({
        type: "FeatureCollection" as const,
        features: toRaw(props.held),
      }),
      () => props.shapeStyle ?? {},
    );

    const controls = useTerraDraw({
      state: () => ({
        features: props.features,
        tool: props.tool,
        disabled: props.disabled,
      }),
      snappable: props.snappable,
      snapDistance: props.snapDistance,
      shapeStyle: props.shapeStyle,
      onEdit: (edit) => emit("edit", edit),
    });
    emit("controls", controls);
    onBeforeUnmount(() => emit("controls", null));

    // The box as text, so a new array with the same corners does not refit.
    const box = computed(() =>
      geoBounds({
        type: "FeatureCollection",
        features: [...toRaw(props.features), ...toRaw(props.held)],
      }),
    );
    const boxKey = computed(() => (box.value ? box.value.join(",") : ""));
    let fitted = false;
    watch(
      boxKey,
      () => {
        const corners = box.value;
        if (!props.fit || fitted || !corners) return;
        fitted = true;
        if (props.getValue() === props.written.current) return;
        if (!isLngLatBox(corners)) return;
        map.fitBounds(corners, { padding: 20, maxZoom: 18, duration: 0 });
      },
      { immediate: true },
    );
    return () => null;
  },
  {
    name: "ShapeInputEditor",
    props: {
      features: { type: null, required: true },
      held: { type: null, required: true },
      tool: { type: null, default: null },
      disabled: { type: Boolean, default: false },
      snappable: { type: Boolean, default: true },
      snapDistance: { type: Number, default: 20 },
      shapeStyle: { type: null, default: undefined },
      fit: { type: Boolean, default: true },
      getValue: { type: null, required: true },
      written: { type: null, required: true },
    },
    emits: {
      edit: (_edit: TerraDrawEdit) => true,
      controls: (_controls: UseTerraDrawResult | null) => true,
    },
  },
);
</script>

<script setup lang="ts">
/**
 * Edits a GeoJSON value in a form field by drawing on a map. The field is the
 * only copy of the value: the map editor shows it and proposes edits, and each
 * finished drawing, vertex drag, move or removal is written to the field and
 * announced with `commit`. Parts the editor cannot hold (a Polygon with holes,
 * a Multi geometry inside a collection) show read-only and stay in the value.
 *
 * Needs the optional `maplibre-gl`, `terra-draw` and
 * `terra-draw-maplibre-gl-adapter` peers.
 *
 * @example
 * <ShapeInput source="area" kind="Polygon" label="Area" />
 */

import {
  deepEqual,
  featuresToShape,
  heldFeatures,
  shapeToFeatures,
} from "@chelone/core";
import { ref, shallowRef } from "vue";
import { useInput } from "../../form/use-input";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import InputHelperText from "../admin/common/input-helper-text.vue";
import ValidationError from "../admin/common/validation-error.vue";
import FieldLabelText from "../admin/common/field-label-text.vue";
import MapCanvas from "../maps/map-canvas.vue";
import { FieldError } from "../ui/field";
import DrawToolbar from "./draw-toolbar.vue";
import { cutFeatures, type DrawFeature } from "./geometry-ops";

const props = withDefaults(defineProps<ShapeInputProps>(), {
  label: undefined,
  helperText: undefined,
  validate: undefined,
  minVertices: undefined,
  maxVertices: undefined,
  minAreaM2: undefined,
  allowSelfIntersection: true,
  tools: undefined,
  snappable: true,
  snapDistance: 20,
  disabled: false,
  defaultCenter: () => [0, 0],
  zoom: 13,
  height: 300,
  mapStyle: undefined,
  shapeStyle: undefined,
  aspectRatio: undefined,
  fitBounds: true,
  refine: undefined,
});

const emit = defineEmits<{
  /** After each drawing or edit has been written to the form, with the stored value, and again after `refine` writes a changed one. */
  commit: [value: ShapeValue | null];
}>();

const translate = useTranslate();
// The limits run before the caller's validators.
// An array, not a composed validator: `useInput` finds `required()` in a list.
const validators: Validator[] = [
  ...(props.minVertices === undefined ? [] : [minVertices(props.minVertices)]),
  ...(props.maxVertices === undefined ? [] : [maxVertices(props.maxVertices)]),
  ...(props.minAreaM2 === undefined ? [] : [minAreaM2(props.minAreaM2)]),
  ...(props.allowSelfIntersection ? [] : [noSelfIntersection()]),
  ...(Array.isArray(props.validate)
    ? props.validate
    : props.validate
      ? [props.validate]
      : []),
];
const input = useInput({
  source: props.source,
  validate: validators,
  format: (v: unknown) => v ?? null,
});

// The field is the source of truth: the draft follows it, from outside or from
// this input's own commit. A null or malformed value gives no features.
const draft = computed(() => shapeToFeatures(props.kind, input.value.value));
const held = computed(() => heldFeatures(props.kind, input.value.value));

const tool = ref<DrawTool | null>(null);
const controls = shallowRef<UseTerraDrawResult | null>(null);
const written: Written = { current: undefined };

const invalid = computed(
  () => input.touched.value && input.error.value != null,
);

let refining: AbortController | null = null;
onBeforeUnmount(() => refining?.abort());

async function runRefine(committed: ShapeValue) {
  const refineValue = props.refine;
  if (!refineValue) return;
  const abort = new AbortController();
  refining = abort;
  try {
    const result = await refineValue(committed, { signal: abort.signal });
    if (abort.signal.aborted || result === null) return;
    // Only an untouched field takes the result: anything else was edited since.
    if (
      toRaw(input.value.value) !== toRaw(committed) ||
      deepEqual(result, committed)
    ) {
      return;
    }
    written.current = result;
    input.setValue(result);
    input.blur();
    emit("commit", result);
  } catch {
    // A failed refinement keeps the value as the user drew it.
  }
}

function onEdit(edit: TerraDrawEdit) {
  // A newer edit makes any pending refinement stale, whatever the edit is.
  refining?.abort();
  // A part the editor refused is not in the edit: it stays in the value, as
  // the held parts do. A single-shape value takes the new drawing instead.
  const refused = HOLDS_MANY.has(props.kind)
    ? (controls.value?.refused.value ?? [])
    : [];
  let features = [...edit.features, ...refused];
  const prev = input.value.value;
  let addHeld = true;
  if (edit.type === "cut") {
    // The tool clears either way; a cut that touched nothing commits nothing.
    tool.value = null;
    // The editor holds no polygon with a hole, so the held parts are cut too.
    // The result then holds every part, so `prev` only lends its own members.
    const cut = cutFeatures(
      [...features, ...heldFeatures(props.kind, prev)],
      edit.cutter,
    );
    if (!cut.changed) return;
    // A single-shape value stores the last feature: a split would lose the rest.
    if (!HOLDS_MANY.has(props.kind) && cut.features.length > 1) return;
    features = cut.features;
    addHeld = false;
  }
  const next = featuresToShape(props.kind, features, prev, {
    aspectRatio: props.aspectRatio,
    addHeld,
  });
  written.current = next;
  input.setValue(next);
  input.blur();
  if (edit.type === "draw") tool.value = null;
  emit("commit", next);
  if (next !== null) void runRefine(next);
}
</script>

<template>
  <fieldset
    data-slot="shape-input"
    :class="cn('flex min-w-0 flex-col gap-3 border-0 p-0', props.class)"
    :data-invalid="invalid || undefined"
  >
    <legend v-if="props.label !== false && props.label !== ''" class="mb-1.5 text-sm font-medium">
      <FieldLabelText
        :label="props.label"
        :source="props.source" /><span v-if="input.isRequired"> *</span>
    </legend>
    <DrawToolbar
      v-if="!props.disabled"
      v-model:active="tool"
      :tools="props.tools ?? defaultTools(props.kind)"
      :can-delete="(controls?.selectedId.value ?? null) !== null"
      @delete="controls?.deleteSelected()"
    />
    <MapCanvas
      :center="props.defaultCenter"
      :zoom="props.zoom"
      :height="props.height"
      :map-style="props.mapStyle"
    >
      <Editor
        :features="draft"
        :held="held"
        :tool="tool"
        :disabled="props.disabled"
        :snappable="props.snappable"
        :snap-distance="props.snapDistance"
        :shape-style="props.shapeStyle"
        :fit="props.fitBounds"
        :get-value="() => input.value.value"
        :written="written"
        @edit="onEdit"
        @controls="controls = $event"
      />
    </MapCanvas>
    <p
      v-if="(controls?.refused.value.length ?? 0) > 0"
      data-slot="shape-input-warning"
      class="text-sm text-amber-600 dark:text-amber-500"
    >
      {{
        translate("chelone.map.shape_not_shown", {
          _: "Part of this shape cannot be shown on the map",
        })
      }}
    </p>
    <InputHelperText :helper-text="props.helperText" />
    <FieldError v-if="invalid">
      <ValidationError :error="input.error.value" />
    </FieldError>
  </fieldset>
</template>
