# Chelone

A headless admin engine: a vanilla-TypeScript core with thin React and Vue adapters, distributed as a shadcn registry. Read `docs/charter.md` before any design decision and `docs/roadmap.md` for what is built and what is next. `docs/parity-report.md` maps every gap against react-admin's `ra-core`; `docs/vue-adapter-design.md` covers the Vue adapter.

## The boundary

- `@chelone/core` is framework-free: no React, Vue, or router imports. Biome's `noRestrictedImports` fails the lint on them, and the override in `biome.json` says where each belongs.
- `@chelone/vue` never imports `@chelone/react` or any React package; both adapters subscribe to core independently.
- Parity: a feature lands in vanilla core, or in both adapters in the same pull request. A React-only change to shared behaviour is half a change. When a ticket names one adapter only, say so in the pull request.
- Biome checks `.vue` files for imports only (`noRestrictedImports`; no formatter, no other rule). `vue-tsc` (the Vue package's `typecheck`) is the gate for the rest. The import fences: core imports only `@tanstack/query-core`, `@tanstack/form-core`, `zod`, `dot.paths`, `geojson` (`import type` only), `node:*` and relative paths; `@chelone/supabase` only `@chelone/core` and `@supabase/supabase-js`, and `src/codegen/` may also import `typescript` and `supazod` (`src/index.ts` never imports either); `@chelone/utils` only `@chelone/core`, `@tanstack/query-core` and its own optional peer per subpath (`cron`: `cronstrue`; `geo`: `@turf/difference`, `@turf/simplify`; `osm`: `@turf/buffer`, `@turf/difference`, `@turf/union`, `osm2geojson-lite`); in both adapters each heavy optional peer (maps, monaco, mdx-editor, supabase, papaparse, tiptap, dompurify, `@dnd-kit/*`) is importable only from its add-on's `components/` folder and entry file, and `@chelone/utils/geo` and `@chelone/utils/osm` follow the maps peers (`@chelone/utils/cron` is importable anywhere, since `cronstrue` is an adapter dependency). Test files are exempt.

## Working on a ticket

- One ticket, one pull request. Anything you notice outside the ticket goes in the pull request as a note, not in the diff. A visual defect in a component the pull request shows is inside the ticket: see The showcase.
- Test first. Tests use vitest and run with `--typecheck`; a run passes only when the summary shows `Type Errors  no errors` and the command exits 0.
- Test from the outside: mount the component under `<Admin>` (see the harnesses in `packages/vue/src/components/admin/inputs/*.test.ts` and `packages/react/src/components/admin/inputs/*.test.tsx`) and assert DOM, roles and data-provider calls. jsdom applies no CSS, so never assert styling.
- A package that imports a dependency declares it in its own `package.json`. pnpm hoisting can hide a missing one locally; CI's fresh install will not.
- After adding, moving or removing a React or Vue component file, or changing what one imports, run `pnpm --dir packages/react registry:generate` or `pnpm --dir packages/vue registry:generate` and commit that package's `registry.json`. CI fails on a stale one.
- Types are exact: no `any`, no `as unknown as`, no `as never`, and `unknown` only at a real boundary. Read `.claude/skills/chelone-typescript/SKILL.md` before writing TypeScript. `pnpm check:type-escapes` fails on any new escape. It compares each file with the same file on main, so there is no baseline to edit.
- Comment only what would surprise the next reader.
- Before writing a helper, search core, `@chelone/utils` and the other adapter for one. Logic both adapters need goes in core. Test-only helpers go in `@chelone/test-utils`, a private workspace package that imports no Chelone package; the adapters may import it only from test files and `__fixtures__`.
- `pnpm check:duplication` (jscpd, counted per file pair against `duplication-baseline.json`) fails on new duplication and names both copies. Remove the copy instead. `pnpm check:duplication --update` is only for a pull request that removes or moves duplication, never to let a new clone through.
- `pnpm check:type-cost` fails when a package's Instantiations or Types pass `type-cost-budget.json`. Find what grew first. `pnpm check:type-cost --update` is for a change that needs the cost, with why in the pull request, and for a TypeScript upgrade.
- Prop parity: `pnpm test:scripts` compares each component's React and Vue props with `prop-parity-baseline.json`, set aside `class`/`className`, `readonly`/`readOnly`, callback props and emits, and `children` and slots, so a React prop a Vue slot stands for is not a gap. A new one-sided prop fails, and so does a row the adapters no longer have. `node scripts/prop-parity.test.mjs --update` rewrites the list.
- Run `pnpm format` before every commit: `pnpm lint` fails on any file Biome would reformat. The pre-push hook in `.githooks/` runs `pnpm lint` and refuses the push when it fails; it also runs the duplication check, and skips it with a warning when jscpd is not installed (CI still runs it); `pnpm install` turns it on.
- Commits: a conventional prefix (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`) and a body that says why. Pull request bodies: a short bullet list of what changed, no em dashes, no bold.

## The showcase

Every component has a full demo in the docs and a place in the demos, in both adapters, and every pull request that touches one shows both. `showcase.json` says where.

- A new component lands with a docs demo in `apps/website/src/docs/content/<section>/<name>/demos/`, a place in `apps/demo` and `apps/vue-demo` where it does real work, and a complete entry: `{ "react": { "docs": SHOT, "demo": SHOT }, "vue": { "demo": SHOT } }`. A component in one adapter has that adapter's side only.
- A SHOT is `{ "path": "/demo/posts/create", "see": "role=textbox[name=\"Title\"]", "click": ["..."] }`: the page, a Playwright selector that proves the component is on it, and what to click first when it sits behind a dialog or a tab. The demos live under `/demo/` and `/vue-demo/`.
- A part that only renders inside another component is `{ "shownBy": "<that component>" }`.
- `null` is a component older than this rule, still owed. A ticket fills it in; nothing new gets one.
- The Vue `docs` shot is the React `docs` shot with `?framework=vue`, so an entry names the docs page once and never writes that shot. A Vue docs demo is a `demos/<file>.vue` beside its React twin.
- Look at the component in a browser before finishing, at the width and in the states it ships in. The `showcase` entry in `.claude/launch.json` serves the docs, `/demo/` and `/vue-demo/` on one port, and that is the dev server a kelpie worker's `browser_*` tools reach.
- The shots exist so every component looks right. Take a screenshot with `browser_take_screenshot`, since a snapshot shows no position, and fix whatever looks out of place, such as a button off centre, in the component, in both adapters, in the same pull request, even when the ticket only asked for a demo and the file is not in its `Touches:`. A fix that needs a redesign goes in the pull request as a note.
- CI photographs each changed component's docs page and demo and writes them into a section at the bottom of the pull request body (`scripts/showcase-shots.mjs`), replaced on every run. A `see` that never appears fails the `check` job. Pull request authors post nothing themselves.
- A reviewer checks the diff for presence: a new component has its complete `showcase.json` entry, a docs demo file, and a use in `apps/demo` and `apps/vue-demo`, and a changed component's `see` still matches what it renders. Report each one missing. A visual fix to a component the pull request shows counts as asked for.

## Checks

From the root, the same commands CI runs (`.github/workflows/ci.yml`):

```bash
pnpm install --frozen-lockfile
pnpm format      # the fix, not a CI step: biome rewrites files so lint passes
pnpm lint        # biome
pnpm test:scripts # node --test over scripts/, prop parity included
pnpm check:duplication
pnpm check:type-escapes
pnpm check:type-cost
pnpm check:showcase
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
