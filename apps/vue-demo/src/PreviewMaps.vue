<script setup lang="ts">
/**
 * `<PreviewMaps>` — the map services a maps demo reads, as the maps guide sets
 * them in an app: the public OpenStreetMap ones, which suit demos only (see
 * maps-services.ts). The Vue twin of the website's React `PreviewMaps`.
 */

import { MapsProvider } from "@chelone/vue/maps";
import { mapsConfig } from "./maps-services";
</script>

<template>
  <MapsProvider v-bind="mapsConfig"><slot /></MapsProvider>
</template>
