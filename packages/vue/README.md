# @chelone/vue

The Vue 3 adapter for Chelone, a headless admin engine, and the source of its shadcn-vue component registry.

```bash
pnpm add @chelone/vue vue vue-router @tanstack/vue-query
```

## Optional entry points

Each entry below needs the peer dependencies listed beside it, and only that entry loads them. The main entry needs none of them.

| Entry | Optional peers |
| --- | --- |
| `@chelone/vue/monaco` | `monaco-editor`, `@guolao/vue-monaco-editor` |
| `@chelone/vue/mdx-editor` | `@milkdown/crepe`, `@milkdown/kit` |
| `@chelone/vue/csv-import` | `papaparse` |
| `@chelone/vue/maps` | `maplibre-gl` |
| `@chelone/vue/maps/draw` | `maplibre-gl`, `terra-draw`, `terra-draw-maplibre-gl-adapter`, `@turf/difference`, `@turf/simplify` |
| `@chelone/vue/maps/osm` | `maplibre-gl`, `osm2geojson-lite`, `@turf/buffer`, `@turf/difference`, `@turf/union` |
| `@chelone/vue/supabase` | `@chelone/supabase` |

## shadcn-vue registry

Add components to your project from the Vue registry. The React registry at `https://chelone.dev/r/` shares item names such as `admin`, so use the `/r/vue/` path:

```bash
npx shadcn-vue@latest add https://chelone.dev/r/vue/<item>.json
```

Docs: https://chelone.dev
