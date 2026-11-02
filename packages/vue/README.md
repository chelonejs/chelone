# @chelone/vue

The Vue 3 adapter for Chelone, a headless admin engine, and the source of its shadcn-vue component registry.

```bash
pnpm add @chelone/vue vue vue-router @tanstack/vue-query
```

Optional peer dependencies (`@chelone/supabase`, `@guolao/vue-monaco-editor`, `@milkdown/crepe`, `@milkdown/kit`, `maplibre-gl`, `monaco-editor`, `papaparse`) are needed only by the matching entry points.

## shadcn registry

Add components to your project from the registry:

```bash
npx shadcn@latest add https://chelone.dev/r/<item>.json
```

Docs: https://chelone.dev
