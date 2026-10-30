# Chelone `@chelone/vue` — Adapter Design

**Date:** 2026-07-06 · **Charter:** [`charter.md`](charter.md)

## Goal

Build **`@chelone/vue`** — a full, shipped Vue 3 adapter mirroring `@chelone/react` against the proven-headless `@chelone/core`. Not merely a validation spike: a real product. But the *first* milestone deliberately doubles as the validation — a runnable Vue admin proving the headless model scales to a second framework.

**Thesis being tested:** the Chelone adapters differ only in *how they subscribe* to state; everything they subscribe *to* lives in `@chelone/core`. A clean Vue port with an **untouched core** is the proof. Any forced core change (with `@chelone/react` still green) is a leaked React assumption made honest — also a win. We just have to see which.

## Scout ground-truth (2026-07-06)

- **Core is genuinely React-free:** `0` react/react-dom/react-router/@tanstack/react imports, `0` `.tsx` files in `packages/core/src`. The Biome boundary lint held.
- **`MicroStore<T>`** (`packages/core/src/store/micro-store.ts`): `getSnapshot(): T` + `subscribe(cb): () => void` + `onSubscribed?: () => (() => void) | void` (the 4R acquire/release). This is exactly `useSyncExternalStore`'s contract — and Chelone owns it.
- **TanStack has Vue parity:** `@tanstack/vue-query` + `@tanstack/vue-store` + `vue-router` all exist, mirroring the React deps. `form-core` / `query-core` are already vanilla.
- **`RouterPort`** (`packages/core/src/router/port.ts`) is vanilla + SSR-safe; `@chelone/react` supplies a react-router `RouterAdapter` injected via context.

## Ratified decisions (participate Q&A)

| # | Decision |
|---|----------|
| D1 | **Full `@chelone/vue` adapter** — a shipped product mirroring `@chelone/react`, not a throwaway spike. |
| D2 | **UI basis = shadcn-vue / reka-ui** — the direct analog of React's shadcn/ui; same copy-in registry model, Tailwind, design language. |
| D3 | **`<Admin>`/`<Resource>` = self-registration + prop escape** — `<Resource>` self-registers via provide/inject; `<Admin>` builds routes reactively; `:resources` prop escape hatch. Singular page overrides (Layout/LoginPage) via **named slots**. |
| D4 | **First milestone = end-to-end vertical CRUD slice**, then broaden the surface. De-risks the thesis fastest (how React's P7 probe worked). |
| D5 | **Zero core changes is a hard success signal.** A forced core edit = a leaked React assumption → fix in core, keep `@chelone/react` green, note it. |

## Section A — Architecture + reactivity bridge

**Topology.** New `packages/vue` = `@chelone/vue`, sibling to `packages/{core,react}`. Depends on `@chelone/core` (`workspace:*`, unchanged). Peers: `vue`, `vue-router`, `@tanstack/vue-query` (+ `@tanstack/vue-store` if used for forms — see below). Same monorepo, registry-generator, and boundary discipline as `@chelone/react`.

**Two subscribe seams, both trivial because core owns its state:**

1. **Controller/store state** → Chelone's own `MicroStore<T>`. Vue bridge (~15 lines):
   ```ts
   function useStore<T>(store: MicroStore<T>) {
     const state = shallowRef(store.getSnapshot())
     const stop = store.subscribe(() => { state.value = store.getSnapshot() })
     onScopeDispose(stop)   // 4R release on scope teardown
     return state           // subscribe() fires onSubscribed → 4R acquire
   }
   ```
   The **4R lifecycle maps 1:1**: `subscribe` → `onSubscribed` (acquire); `onScopeDispose` → unsub (release). Vue's component/`effectScope` disposal replaces React's `useSyncExternalStore` teardown. A selector variant (`useStoreSelector(store, sel)`) memoizes with `computed`.

2. **Form state** → `form-core` (vanilla; React bridges via `@tanstack/react-store`). Vue bridges via `@tanstack/vue-store` **or**, if that binding is awkward, subscribes to form-core's own store with the *same* `useStore` pattern (form-core exposes `subscribe`). No new coupling either way.

**Data layer** → `@tanstack/vue-query` over the same `query-core` keys / `dataProvider`. **i18n/errors** → unchanged (core emits `TranslatableMessage` / keys; Vue renders them).

## Section B — Composition + router

**`<Admin>`/`<Resource>`:**
```vue
<Admin :data-provider="dp" :i18n="i18n">
  <template #layout><MyLayout/></template>   <!-- optional singular overrides -->
  <Resource name="posts"   :list="PostList" :edit="PostEdit" :create="PostCreate"/>
  <Resource name="authors" :list="AuthorList"/>
</Admin>
```
- **Repeatable resources** → `<Resource>` `inject`s the registry `<Admin>` provides, calls `register(def)` on `setup`, `onScopeDispose` unregisters; renders nothing (registration marker). `<Admin>` holds the registry `reactive`ly and rebuilds routes on change. Vue-native mirror of React's marker-partition; keeps "just compose components".
- **Singular page overrides** (Layout/LoginPage/Dashboard) → **named slots** (`#layout`, `#login`), idiomatic + typed. React needed `<Admin.Layout>` markers because JSX children are untyped; Vue slots do this natively.
- **Escape hatch** → `:resources="[{ name, list, edit }]"` prop (mirrors React's config path).

**Router adapter — vue-router over `RouterPort`.** Core's `RouterPort` is framework-agnostic. Vue supplies a `RouterAdapter` (same shape React's provides), injected via provide/inject (mirrors `RouterAdapterContext`):
- Composables components consume: `useNavigate`/`useLocation`/`useParams`/`useRedirect`/`useCreatePath`, wrapping vue-router's `useRouter`/`useRoute`.
- `<Admin>` generates vue-router route records from registered resources.
- Unsaved-changes `block()` → vue-router `onBeforeRouteLeave` guard (analog of react-router's blocker).
- vue-router = default adapter; a second Vue router (TanStack Router Vue) is a reference slot, mirroring React.

## Section C — Component port + phase plan

**Three layers, mirroring React, genuinely re-authored (not mechanical):**
- **`ui/` primitives** ← copy from **shadcn-vue** (`.vue` SFCs on reka-ui), like React copied shadcn/ui verbatim.
- **Composables** ← each `@chelone/react` hook gets a Vue twin (`useInput`, `useListController`, `useChoices`, `useReferenceInput`, compat hooks…), all wrapping the same vanilla core controllers via the Section-A bridge. Ports cleanest — it's logic, and logic lives in core.
- **`admin/` components** ← each React component gets a `.vue` SFC twin. Same seam (React hook → Vue composable; error-shape/i18n core-owned), different authoring model (`<template>` + `<script setup>` vs TSX) → real per-component re-authoring guided by the finished React twin. The honest bulk of the work.

**Phases (core is done → this is the "React P7" equivalent + the bridge). Each phase = the SDD workflow rhythm (implementer + reviewer + probe + opus).**

| Phase | Deliverable | Gate |
|---|---|---|
| **V1** first milestone | Bridge (`useStore` + form bridge) + vue-router `RouterAdapter` + `<Admin>`/`<Resource>` + composables & components for ONE full vertical: List/DataTable, Edit/Create, ~3 inputs + ReferenceInput, TextField/ReferenceField, SaveButton/Toolbar | **Runnable Vue admin, full CRUD vs `fakeDataProvider`, browser-verified** (Claude Preview) — the Vue analog of P7's e2e probe. Core untouched (or justified fix + React green). |
| **V2** | Remaining ~31 inputs + ~30 fields (composables + SFCs) | surface breadth |
| **V3** | List/datatable features + CRUD view shells + layout chrome (AppBar/Sidebar/Menu/Theme/UserMenu) + auth pages + all buttons + feedback/common | **v1 surface parity with `@chelone/react`** |
| **V4** | shadcn-vue registry pipeline (`npx shadcn-vue add @chelone/…`) | installable; reuses the engine-seam + `@/`-alias-deps handling already solved for the React registry |
| **V5** | Vue docs — framework toggle (React ǀ Vue tabs) on the existing site | documented |

Every Vue component has a finished React twin as its reference — disciplined translation, not invention.

## Section D — Testing + success criteria

- **Testing:** Vitest + `@vue/test-utils` (composables/SFCs) + a browser provider (`vitest-browser-vue`, mirroring `vitest-browser-react`) for real-DOM tests. V1 probe = a real `<Admin><Resource>` **Vue demo app**, full CRUD vs `fakeDataProvider`, browser-verified via Claude Preview. Core's controller logic is already tested; Vue tests cover only the bridge + composables + SFCs.
- **Zero-core-change gate:** Biome boundary lint stays. A forced core edit = a leaked React assumption → fix in core, re-run `@chelone/react` green, note it. Clean port with untouched core = thesis proven; justified core fix + React green = model made more honest. Both are wins.
- **Success:** V1 = runnable Vue admin, full CRUD browser-verified, core untouched (or justified fix + React green). Full = v1 surface parity + installable shadcn-vue registry + Vue docs.

## Risks

1. **shadcn-vue ≠ shadcn/ui 1:1.** reka-ui props/components differ from radix in places — some `ui/` primitives need adaptation, not copy. Confirm the shadcn-vue component set covers what the admin surface needs (combobox/command, sidebar, field, data-table primitives).
2. **V2/V3 are the real volume.** A full component surface is large regardless of the reference twin.
3. **`@tanstack/vue-store` fit for form-core.** If the binding is awkward, fall back to bridging form-core's own `subscribe` with the `useStore` pattern (no blocker either way).
4. **Vue registry via shadcn-vue CLI.** The shadcn-vue registry format/CLI differs from shadcn; the engine-seam + `@/`-alias-dep handling ports conceptually but needs new plumbing (V4).
5. **SFC re-authoring fidelity.** Translating TSX logic to `<script setup>` per component risks subtle behavior drift — the browser probe per phase + the React twin as oracle mitigate.

## To verify at build time (not blockers)

- `@tanstack/vue-store` current API + form-core binding ergonomics.
- shadcn-vue current maintenance + component coverage for the admin surface.
- `vitest-browser-vue` availability (else `@vue/test-utils` + Playwright-component).

## Out of scope (this effort)

- Nuxt/SSR-specific integration beyond what `RouterPort`'s SSR-safety already gives (a `@chelone/nuxt`/`@chelone/start`-Vue is post-parity).
- A second Vue router adapter beyond the vue-router default (TanStack Router Vue stays a reference slot).
