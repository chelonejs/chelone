# Chelone

A headless admin engine: a vanilla-TypeScript core with thin React and Vue adapters, distributed as a shadcn registry. Read `docs/charter.md` before any design decision and `docs/roadmap.md` for what is built and what is next. `docs/parity-report.md` maps every gap against react-admin's `ra-core`; `docs/vue-adapter-design.md` covers the Vue adapter.

## The boundary

- `@chelone/core` is framework-free: no React, Vue, or router imports. Biome's `noRestrictedImports` fails the lint on them, and the override in `biome.json` says where each belongs.
- `@chelone/vue` never imports `@chelone/react` or any React package; both adapters subscribe to core independently.
- Parity: a feature lands in vanilla core, or in both adapters in the same pull request. A React-only change to shared behaviour is half a change. When a ticket names one adapter only, say so in the pull request.
- Biome checks `.vue` files for imports only (`noRestrictedImports`; no formatter, no other rule). `vue-tsc` (the Vue package's `typecheck`) is the gate for the rest. The import fences: core imports only `@tanstack/query-core`, `@tanstack/form-core`, `zod`, `dot.paths`, `geojson` (`import type` only), `node:*` and relative paths; `@chelone/supabase` only `@chelone/core` and `@supabase/supabase-js`, and `src/codegen/` may also import `typescript` and `supazod` (`src/index.ts` never imports either); `@chelone/utils` only `@chelone/core`, `@tanstack/query-core` and its own optional peer per subpath (`cron`: `cronstrue`; `geo`: `@turf/difference`, `@turf/simplify`; `i18next`: `i18next`; `osm`: `@turf/buffer`, `@turf/difference`, `@turf/union`, `osm2geojson-lite`); in both adapters each heavy optional peer (maps, monaco, mdx-editor, supabase, papaparse, tiptap, dompurify, `@dnd-kit/*`) is importable only from its add-on's `components/` folder and entry file, and `@chelone/utils/geo` and `@chelone/utils/osm` follow the maps peers (`@chelone/utils/cron` is importable anywhere, since `cronstrue` is an adapter dependency); `i18next` and `@chelone/utils/i18next` are importable from neither adapter, only from an app. Test files are exempt.

## Working on a ticket

- One ticket, one pull request. Anything you notice outside the ticket goes in the pull request as a note, not in the diff.
- Test first. Tests use vitest and run with `--typecheck`; a run passes only when the summary shows `Type Errors  no errors` and the command exits 0.
- Test from the outside: mount the component under `<Admin>` (see the harnesses in `packages/vue/src/components/admin/inputs/*.test.ts` and `packages/react/src/components/admin/inputs/*.test.tsx`) and assert DOM, roles and data-provider calls. jsdom applies no CSS, so never assert styling.
- A package that imports a dependency declares it in its own `package.json`. pnpm hoisting can hide a missing one locally; CI's fresh install will not.
- After adding, moving or removing a React or Vue component file, or changing what one imports, run `pnpm --dir packages/react registry:generate` or `pnpm --dir packages/vue registry:generate` and commit that package's `registry.json`. CI fails on a stale one.
- A pull request that adds or changes a type-safety feature updates its page under `apps/website/src/docs/content/type-safety/`. Its snippets are `twoslash` fences, and the website build fails on one whose types drift.
- Type docs: `pnpm check:type-docs` reads every `.` export of core, react, vue and supabase and fails an export whose signature names a registry type (`Register`, `ResourceMap`, `SourcePath`, …) while naming no Type Safety page. `type-docs.json` maps a page slug to the rows it names; `type-docs-baseline.json` holds the rows still owed, under the page that will explain them, and only shrinks, so a new export goes to `type-docs.json` with its page naming it as a whole word. `node scripts/check-type-docs.mjs --update` rewrites both from the tree.
- Types are exact: no `any`, no `as unknown as`, no `as never`, and `unknown` only at a real boundary. Read `.claude/skills/chelone-typescript/SKILL.md` before writing TypeScript. `pnpm check:type-escapes` fails on any new escape. It compares each file with the same file on main, so there is no baseline to edit.
- Comment only what would surprise the next reader.
- Before writing a helper, search core, `@chelone/utils` and the other adapter for one. Logic both adapters need goes in core. Test-only helpers go in `@chelone/test-utils`, a private workspace package that imports no Chelone package; the adapters may import it only from test files and `__fixtures__`.
- `pnpm check:duplication` (jscpd, counted per file pair against `duplication-baseline.json`) fails on new duplication and names both copies. Remove the copy instead. `pnpm check:duplication --update` is only for a pull request that removes or moves duplication, never to let a new clone through.
- `pnpm check:type-cost` fails when a package's Instantiations or Types pass `type-cost-budget.json`. Find what grew first. `pnpm check:type-cost --update` is for a change that needs the cost, with why in the pull request, and for a TypeScript upgrade.
- Prop parity: `pnpm test:scripts` compares each component's React and Vue props with `prop-parity-baseline.json`, set aside `class`/`className`, `readonly`/`readOnly`, callback props and emits, and `children` and slots, so a React prop a Vue slot stands for is not a gap. A new one-sided prop fails, and so does a row the adapters no longer have. `node scripts/prop-parity.test.mjs --update` rewrites the list.
- Export parity: `pnpm test:scripts` compares the hooks and factories (`use*`, `create*`) each adapter's `package.json` entry points export with `export-parity-baseline.json`, a row per one-sided export, as `react:.:useEvent` or `vue:./maps:useMapLayer`. Components are left out, since `showcase.json` tracks them. A new one-sided hook fails, and so does a row the adapters no longer have, a note that is none of `matches <row>`, `intended: <reason>` or `gap: <what is missing>`, and a `gap:` note still holding the `gap: untriaged` placeholder: every row says why, and the pull request that adds a one-sided export writes its note. An issue that closes a gap takes its row out. `node scripts/export-parity.test.mjs --update` rewrites the list, writing a new row as `gap: untriaged` and keeping every other note as written.
- Run `pnpm format` before every commit: `pnpm lint` fails on any file Biome would reformat. The pre-push hook in `.githooks/` runs `pnpm lint` and refuses the push when it fails; it also runs the duplication check, and skips it with a warning when jscpd is not installed (CI still runs it); `pnpm install` turns it on.
- Commits: a conventional prefix (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`) and a body that says why. Pull request bodies: a short bullet list of what changed, no em dashes, no bold.

## The showcase

Every component has a demo in the docs and a place in the demos, in both adapters. `showcase.json` says where, and `pnpm check:showcase` fails a new component with no complete entry.

- A new component lands with a docs demo in `apps/website/src/docs/content/<section>/<name>/demos/`, a place in `apps/demo` and `apps/vue-demo` where it does real work, and a complete entry: `{ "react": { "docs": PAGE, "demo": PAGE }, "vue": { "demo": PAGE } }`. A component in one adapter has that adapter's side only.
- A PAGE is `{ "path": "/demo/posts/create" }`. The demos live under `/demo/` and `/vue-demo/`. Older entries also hold `see` and `click`, which nothing reads.
- An RSC component's demo place is its route in `apps/start-demo` (for example `/rsc/posts`), since `/demo/` cannot run a server function, and its `showcase.json` entry names that page.
- A part that only renders inside another component is `{ "shownBy": "<that component>" }`.
- A Vue docs demo is a `demos/<file>.vue` beside its React twin, on the same page with `?framework=vue`, so an entry names the docs page once.

## Looking at a change

Look at a visual change in a browser once, when it is finished, at the width it ships in, rather than after each edit. A change with nothing to see needs no look, and nothing needs a screenshot. The `showcase` entry in `.claude/launch.json` serves the docs, `/demo/` and `/vue-demo/` on one port, and that is the dev server a kelpie worker's `browser_*` tools reach.

## Checks

From the root, the same commands CI runs (`.github/workflows/ci.yml`):

```bash
pnpm install --frozen-lockfile
pnpm format      # the fix, not a CI step: biome rewrites files so lint passes
pnpm lint        # biome
pnpm test:scripts # node --test over scripts/, prop and export parity included
pnpm check:duplication
pnpm check:type-escapes
pnpm check:type-cost
pnpm check:showcase
pnpm check:type-docs
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

- An issue that changes behaviour in one adapter carries an `Adapter reach:` line under `Touches:`: `React and Vue in this issue`, or the open issue that ports it to the other adapter, filed at the same time. Logic both adapters need moves to core in that issue.
- An issue that renders stored or user-supplied content (markdown, HTML, URLs, file names) or reads a credential or token has an acceptance criterion with a named test that feeds it hostile input (a `javascript:` URL, a raw `<iframe>`, a token left in the URL) and pins that nothing runs or leaks.

### Triage labels

The five default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root once they exist. See `docs/agents/domain.md`.
