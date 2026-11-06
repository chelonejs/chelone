# @chelone/react

The React adapter for Chelone, a headless admin engine, and the source of its shadcn component registry.

```bash
pnpm add @chelone/react react react-dom react-router @tanstack/react-query @tanstack/react-store
```

## Optional entry points

Each entry below needs the peer dependencies listed beside it, and only that entry loads them. The main entry needs none of them.

| Entry | Optional peers |
| --- | --- |
| `@chelone/react/tanstack-router` | `@tanstack/react-router` |
| `@chelone/react/monaco` | `monaco-editor`, `@monaco-editor/react` |
| `@chelone/react/charts` | `recharts` |
| `@chelone/react/kanban` | `@dnd-kit/react`, `@dnd-kit/dom` |
| `@chelone/react/mdx-editor` | `@mdxeditor/editor` |
| `@chelone/react/block-editor` | `@tiptap/core`, `@tiptap/pm`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extensions`, `@tiptap/suggestion`, `@dnd-kit/react`, `@dnd-kit/dom`, `recharts` |
| `@chelone/react/csv-import` | `papaparse` |
| `@chelone/react/maps` | `maplibre-gl` |
| `@chelone/react/maps/draw` | `maplibre-gl`, `terra-draw`, `terra-draw-maplibre-gl-adapter`, `@turf/difference`, `@turf/simplify` |
| `@chelone/react/maps/osm` | `maplibre-gl`, `osm2geojson-lite`, `@turf/buffer`, `@turf/difference`, `@turf/union` |
| `@chelone/react/supabase` | `@chelone/supabase` |

## shadcn registry

Add components to your project from the registry:

```bash
npx shadcn@latest add https://chelone.dev/r/<item>.json
```

Docs: https://chelone.dev
