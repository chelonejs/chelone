<script lang="ts">
import type {
  OsmPresetName,
  OsmTagInput,
  OverpassProvider,
  SourceProp,
} from "@chelone/core";

/** Props for {@link OsmFeatureOperator}. */
export interface OsmFeatureOperatorProps {
  /** The form field holding the Polygon or MultiPolygon. */
  source: SourceProp;
  /** `subtract` removes the matching OSM areas from the polygon; `add` merges them in. */
  mode: "subtract" | "add";
  /** Named OSM feature sets to query, such as `water`. */
  presets?: readonly OsmPresetName[];
  /** Extra Overpass tag filters, such as `natural=wood`. */
  tags?: readonly OsmTagInput[];
  /** The button text, translated. Defaults to the mode's message. */
  label?: string;
  /** Defaults to the `overpass` of `MapsProvider`. One of the two is required. */
  provider?: OverpassProvider;
  disabled?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * A button that edits the polygon in a form field with OpenStreetMap features
 * from the Overpass service: `subtract` removes them, `add` merges them in.
 * The request runs on the click. The result is written like a user edit, so
 * the form turns dirty and the field's validators run.
 *
 * Needs an Overpass provider, from the `provider` prop or `MapsProvider`'s
 * `overpass`; with neither it throws. The `icon` slot replaces the default icon.
 *
 * @example
 * <OsmFeatureOperator source="area" mode="subtract" :presets="['water']" />
 */

import {
  areaInTypeOf,
  geoAreaM2,
  geoBounds,
  isGeoArea,
  OverpassRateLimitError,
} from "@chelone/core";
import { useQueryClient } from "@tanstack/vue-query";
import type { MultiPolygon, Polygon } from "geojson";
import { onBeforeUnmount, ref, toRaw } from "vue";
import { useInput } from "../../form/use-input";
import { useTranslate } from "../../i18n/use-translate";
import { useNotify } from "../../notification-hooks";
import { useMapsConfig } from "../maps/use-map";
import Button from "../ui/button.vue";
import Spinner from "../ui/spinner.vue";
import { fetchOsmFeatures } from "./osm-features";
import { subtractMask, unionAll } from "./osm-geometry-ops";

const props = withDefaults(defineProps<OsmFeatureOperatorProps>(), {
  presets: undefined,
  tags: undefined,
  label: undefined,
  provider: undefined,
  disabled: false,
});

/**
 * The failure of an aborted request. jsdom and browsers reject with a
 * `DOMException`, which is not an `Error`, so both are tested.
 */
const isAbort = (error: unknown) =>
  (error instanceof Error || error instanceof DOMException) &&
  error.name === "AbortError";

/** Square kilometres to 3 decimals, from a difference in square metres. */
const km2 = (m2: number) => `${(Math.max(0, m2) / 1e6).toFixed(3)} km²`;

const config = useMapsConfig();
if (!(props.provider ?? config.overpass)) {
  throw new Error(
    "OsmFeatureOperator needs an Overpass provider: pass the `provider` prop or set `overpass` on <MapsProvider>.",
  );
}
const translate = useTranslate();
const notify = useNotify();
const queryClient = useQueryClient();
const input = useInput({ source: props.source, format: (v) => v ?? null });
const running = ref(false);
let controller: AbortController | null = null;
onBeforeUnmount(() => controller?.abort());

function write(geometry: Polygon | MultiPolygon | null) {
  input.setValue(geometry);
  input.blur();
}

async function run() {
  const provider = props.provider ?? config.overpass;
  if (!provider) return;
  const value: unknown = toRaw(input.value.value);
  if ((props.presets?.length ?? 0) + (props.tags?.length ?? 0) === 0) {
    notify("chelone.map.osm.no_sources", { type: "warning" });
    return;
  }
  if (!isGeoArea(value)) {
    notify("chelone.map.osm.no_polygon", { type: "warning" });
    return;
  }
  const abort = new AbortController();
  controller = abort;
  running.value = true;
  try {
    const found = await fetchOsmFeatures(
      queryClient,
      geoBounds(value),
      { presets: props.presets, tags: props.tags },
      { provider, signal: abort.signal },
    );
    if (abort.signal.aborted) return;
    // The user may have edited the polygon while the request ran; the
    // answer was worked out for the old one and must not replace the new.
    if (toRaw(input.value.value) !== value) return;
    const matches = found?.features ?? [];
    if (matches.length === 0) {
      notify("chelone.map.osm.no_match", { type: "info" });
      return;
    }
    if (props.mode === "subtract") {
      const left = subtractMask(value, matches);
      if (left === null) {
        write(null);
        notify("chelone.map.osm.covered", { type: "warning" });
        return;
      }
      const kept = areaInTypeOf(value, left);
      if (!kept) {
        notify("chelone.map.osm.would_split", { type: "warning" });
        return;
      }
      write(kept);
      notify("chelone.map.osm.subtracted", {
        type: "success",
        messageArgs: { area: km2(geoAreaM2(value) - geoAreaM2(kept)) },
      });
      return;
    }
    const merged = unionAll([
      { type: "Feature", properties: {}, geometry: value },
      ...matches,
    ]);
    if (merged === null) {
      notify("chelone.map.osm.union_empty", { type: "warning" });
      return;
    }
    const kept = areaInTypeOf(value, merged);
    if (!kept) {
      notify("chelone.map.osm.would_split", { type: "warning" });
      return;
    }
    write(kept);
    notify("chelone.map.osm.added", {
      type: "success",
      messageArgs: { area: km2(geoAreaM2(kept) - geoAreaM2(value)) },
    });
  } catch (error) {
    if (abort.signal.aborted || isAbort(error)) return;
    notify(
      error instanceof OverpassRateLimitError
        ? "chelone.map.osm.rate_limited"
        : "chelone.map.osm.error",
      { type: "error" },
    );
  } finally {
    if (controller === abort) {
      controller = null;
      if (!abort.signal.aborted) running.value = false;
    }
  }
}
</script>

<template>
  <Button
    type="button"
    variant="outline"
    data-slot="osm-feature-operator"
    :class="props.class"
    :disabled="props.disabled || running"
    @click="run"
  >
    <Spinner v-if="running" />
    <slot v-else name="icon" />
    {{
      translate(
        props.label ??
          (props.mode === "subtract"
            ? "chelone.map.osm.subtract"
            : "chelone.map.osm.add"),
      )
    }}
  </Button>
</template>
