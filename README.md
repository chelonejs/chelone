# Chelone

A framework-agnostic, type-safe, headless admin engine.

Docs and live demos: https://chelone.dev

| Package | What it is |
| --- | --- |
| `@chelone/core` | Vanilla-TS core: resource registry (Zod), data, list/record/form controllers, auth, i18n. No framework imports. |
| `@chelone/react` | React adapter and the shadcn component registry. |
| `@chelone/vue` | Vue 3 adapter and the shadcn-vue component registry. |
| `@chelone/supabase` | Supabase data and auth providers for core. |

| App | What it is |
| --- | --- |
| `apps/demo` | React reference admin. |
| `apps/vue-demo` | Vue reference admin. |
| `apps/website` | Docs site with live demos. |
| `apps/start-demo` | TanStack Start admin: route-less `<Admin>` and loader prefetch. |
| `apps/next-demo` | Next.js App Router admin: server prefetch into a `HydrationBoundary`. |

## Develop

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Docs

- [`docs/charter.md`](docs/charter.md): the design and its principles.
- [`docs/roadmap.md`](docs/roadmap.md): parity with react-admin, what is done and what is next.
- [`docs/parity-report.md`](docs/parity-report.md): the gap analysis behind the roadmap.
- [`docs/vue-adapter-design.md`](docs/vue-adapter-design.md): the Vue adapter.
