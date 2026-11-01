# Chelone

A headless admin engine: a vanilla-TypeScript core with thin React and Vue adapters, distributed as a shadcn registry. Read `docs/charter.md` before any design decision and `docs/roadmap.md` for what is built and what is next. `docs/parity-report.md` maps every gap against react-admin's `ra-core`; `docs/vue-adapter-design.md` covers the Vue adapter.

## The boundary

- `@chelone/core` is framework-free: no React, Vue, or router imports. Biome's `noRestrictedImports` fails the lint on them, and the override in `biome.json` says where each belongs.
- `@chelone/vue` never imports `@chelone/react` or any React package; both adapters subscribe to core independently.
- Parity: a feature lands in vanilla core, or in both adapters in the same pull request. A React-only change to shared behaviour is half a change. When a ticket names one adapter only, say so in the pull request.
- Biome does not lint `.vue` files. For them, `vue-tsc` (the Vue package's `typecheck`) is the gate.

## Working on a ticket

- One ticket, one pull request. Anything you notice outside the ticket goes in the pull request as a note, not in the diff.
- Test first. Tests use vitest and run with `--typecheck`; a run passes only when the summary shows `Type Errors  no errors` and the command exits 0.
- Test from the outside: mount the component under `<Admin>` (see the harnesses in `packages/vue/src/components/admin/inputs/*.test.ts` and `packages/react/src/components/admin/inputs/*.test.tsx`) and assert DOM, roles and data-provider calls. jsdom applies no CSS, so never assert styling.
- A package that imports a dependency declares it in its own `package.json`. pnpm hoisting can hide a missing one locally; CI's fresh install will not.
- After adding, moving or removing a React or Vue component file, run `pnpm --dir packages/react registry:generate` or `pnpm --dir packages/vue registry:generate` and commit that package's `registry.json`. CI fails on a stale one.
- Comment only what would surprise the next reader.
- Run `pnpm format` before every commit: `pnpm lint` fails on any file Biome would reformat.
- Commits: a conventional prefix (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`) and a body that says why. Pull request bodies: a short bullet list of what changed, no em dashes, no bold.

## Checks

From the root, the same commands CI runs (`.github/workflows/ci.yml`):

```bash
pnpm install --frozen-lockfile
pnpm format      # the fix, not a CI step: biome rewrites files so lint passes
pnpm lint        # biome
pnpm typecheck   # tsc, vue-tsc, react-router typegen
pnpm test        # vitest --typecheck in every package
pnpm build       # demo, vue-demo, website
pnpm --dir packages/react registry:build
pnpm --dir packages/vue registry:build
```

`registry:build` checks its own output, because `shadcn build` exits 0 on error. Never pipe it through `tail`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `chelonejs/chelone`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root once they exist. See `docs/agents/domain.md`.
