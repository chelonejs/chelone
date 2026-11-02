# @chelone/react

The React adapter for Chelone, a headless admin engine, and the source of its shadcn component registry.

```bash
pnpm add @chelone/react react react-dom react-router @tanstack/react-query @tanstack/react-store
```

Optional peer dependencies (`@chelone/supabase`, `@tanstack/react-router`, `@mdxeditor/editor`, `@monaco-editor/react`, `maplibre-gl`, `monaco-editor`, `papaparse`) are needed only by the matching entry points.

## shadcn registry

Add components to your project from the registry:

```bash
npx shadcn@latest add https://chelone.dev/r/<item>.json
```

Docs: https://chelone.dev
