<script lang="ts">
import {
  type GeoFeature,
  geoBounds,
  type MapStyleInput,
  type ShapeStyle,
  type ShapeValue,
  type ShapeValueKind,
  type Validator,
} from "@chelone/core";
import {
  computed,
  defineComponent,
  onBeforeUnmount,
  type PropType,
  toRaw,
  watch,
} from "vue";
import { isLngLatBox } from "../maps/geo-json-view.vue";
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
  source: string;
  /** The kind of value the field holds, which decides what a drawing writes. */
  kind: ShapeValueKind;
  /** The legend. A string is translated; `false` renders none. */
  label?: string | false;
  helperText?: string | false;
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

/**
 * Lives in the `MapCanvas` slot, where `useMap()` works. Runs the Terra Draw
 * editor, draws the read-only held parts, frames the first shape once, and
 * hands the selection controls up to the toolbar.
 */
const Editor = defineComponent({
  name: "ShapeInputEditor",
  props: {
    features: { type: Array as PropType<GeoFeature[]>, required: true },
    held: { type: Array as PropType<GeoFeature[]>, required: true },
    tool: { type: String as PropType<DrawTool | null>, default: null },
    disabled: { type: Boolean, default: false },
    snappable: { type: Boolean, default: true },
    shapeStyle: { type: Object as PropType<ShapeStyle>, default: undefined },
    fit: { type: Boolean, default: true },
    /** The field's current value, whatever it holds. */
    getValue: {
      type: Function as PropType<() => unknown>,
      required: true,
    },
    written: { type: Object as PropType<Written>, required: true },
  },
  emits: {
    edit: (_edit: TerraDrawEdit) => true,
    controls: (_controls: UseTerraDrawResult | null) => true,
  },
  setup(props, { emit }) {
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
});
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
import { humanizeSource } from "../admin/inputs/label-text";
import MapCanvas from "../maps/map-canvas.vue";
import { FieldError } from "../ui/field";
import DrawToolbar from "./draw-toolbar.vue";

const props = withDefaults(defineProps<ShapeInputProps>(), {
  label: undefined,
  helperText: undefined,
  validate: undefined,
  tools: undefined,
  snappable: true,
  disabled: false,
  defaultCenter: () => [0, 0],
  zoom: 13,
  height: 300,
  mapStyle: undefined,
  shapeStyle: undefined,
  fitBounds: true,
});

const emit = defineEmits<{
  /** After each drawing or edit has been written to the form, with the stored value. */
  commit: [value: ShapeValue | null];
}>();

const translate = useTranslate();
const input = useInput({
  source: props.source,
  validate: props.validate,
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
const legend = computed(() =>
  props.label === false
    ? null
    : translate(props.label ?? humanizeSource(props.source), {
        _: props.label ?? humanizeSource(props.source),
      }),
);

function onEdit(edit: TerraDrawEdit) {
  const next = featuresToShape(props.kind, edit.features, input.value.value);
  written.current = next;
  input.setValue(next);
  input.blur();
  if (edit.type === "draw") tool.value = null;
  emit("commit", next);
}
</script>

<template>
  <fieldset
    data-slot="shape-input"
    :class="cn('flex min-w-0 flex-col gap-3 border-0 p-0', props.class)"
    :data-invalid="invalid || undefined"
  >
    <legend v-if="legend" class="mb-1.5 text-sm font-medium">
      {{ legend }}<span v-if="input.isRequired"> *</span>
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
        :shape-style="props.shapeStyle"
        :fit="props.fitBounds"
        :get-value="() => input.value.value"
        :written="written"
        @edit="onEdit"
        @controls="controls = $event"
      />
    </MapCanvas>
    <InputHelperText :helper-text="props.helperText" />
    <FieldError v-if="invalid">
      <ValidationError :error="input.error.value" />
    </FieldError>
  </fieldset>
</template>
