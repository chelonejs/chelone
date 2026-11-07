<script setup lang="ts">
/**
 * The place form, shared by `<PlaceEdit>` and `<PlaceCreate>` (the Vue twin
 * of `placeShapeInputs` in `apps/demo`). The default slot holds the inputs that
 * find the place, which differ between the two pages; the rest is the delivery zone drawn
 * and then thinned, the OpenStreetMap buttons and the other drawing inputs
 * (`maps/draw`). The `data-field` attributes let a showcase shot tell the
 * inputs apart, since `bbox-input` and `shape-input` both render a
 * `shape-input` and the `osm-feature-*` buttons all render an
 * `osm-feature-operator`. The services come from the `<MapsProvider>` in
 * `App.vue`.
 */

import {
  BBoxInput,
  LineStringInput,
  PolygonInput,
  ShapeInput,
  SimplifyInput,
} from "@chelone/vue/maps/draw";
import {
  OsmFeatureAdd,
  OsmFeatureOperator,
  OsmFeatureSubtract,
} from "@chelone/vue/maps/osm";
</script>

<template>
  <div class="flex flex-col gap-4 max-w-xl">
    <slot />
    <div data-field="zone">
      <ShapeInput source="zone" kind="Polygon" label="Delivery zone" />
    </div>
    <!-- Draw the zone above, then thin it here: a drawn value becomes the
         original the slider simplifies from. -->
    <SimplifyInput source="zone" label="Simplify the delivery zone" />
    <div data-field="zone-water">
      <OsmFeatureOperator
        source="zone"
        mode="subtract"
        :presets="['water']"
        label="Remove water from the zone"
      />
    </div>
    <PolygonInput source="area" label="Area" />
    <div class="flex gap-2">
      <OsmFeatureSubtract source="area" :presets="['water']" />
      <OsmFeatureAdd source="area" :presets="['buildings']" />
    </div>
    <LineStringInput source="route" label="Route" snap-to-roads />
    <div data-field="bbox">
      <BBoxInput source="bbox" label="Bounding box" />
    </div>
  </div>
</template>
