# Chelone — Project Charter

> A framework-agnostic, type-safe, SSR/RSC-capable **headless admin engine**, distributed
> shadcn-style (own-your-source registry) with thin per-framework adapters.

**Status:** Draft for review · **Date:** 2026-06-23 (amended 2026-11-08, see §12) · **Supersedes:** the in-place shadmin
modernization RFC (abandoned in favor of greenfield — see §1).

---

## 1. Context & origin

**shadmin** (this repo) is a shadcn/React admin kit built on `ra-core`. It works, ships 348
registry items, and proved the concept. But the next ambition — a *framework-agnostic* admin
core (React today, Vue/Svelte possible) with end-to-end type safety and SSR/RSC support —
requires a different foundation than `ra-core` (React-coupled, loosely typed, SPA-only).

We evaluated three paths: in-place strangler migration, in-place breaking v2, and greenfield.
**Greenfield won** because: (a) the new core changes the public contract anyway (strict types,
TanStack Form, children-composable API), so the strangler's invisible-swap value evaporates;
(b) zero external users means no migration is owed; (c) a clean repo gives clean git history,
contributor graph, and IP; (d) the valuable assets (the app, the components) carry forward as
copy + reference regardless.

**The arc:** `shadmin` (parked concept, React/shadcn on ra-core) → **Chelone** (the
framework-agnostic engine it inspired).

> **Why "Chelone":** the Greek nymph transformed into a turtle (transformation + turtle), root
> of *Chelonia* (the order of all turtles), also the "turtlehead" flower — with "shell" hidden
> inside. Verified clean in software: `chelone` npm + `@chelone/*` scope free, `chelone.dev`
> free, no dev-tool collision. (GitHub org → `chelonejs`, since a dormant user holds the bare
> handle.)

---

## 2. Vision & principles

- **Vanilla-TS headless core + thin per-framework adapters** — the TanStack model
  (`@tanstack/table-core` + `@tanstack/react-table`). Hard logic lives once in the core; each
  adapter is a thin reactivity bridge.
- **Own-your-source distribution** — shadcn's real innovation is the registry/CLI model
  (source in your repo, not `node_modules`), which is framework-neutral. Chelone keeps it.
- **End-to-end type safety** — a Zod **resource registry** is the single source of truth:
  define a resource once, infer record types, form fields, list columns, and validators from it.
- **SSR/RSC-capable** — admin is **server-shell + client-islands** (server: list/read/auth;
  client: forms/optimistic). The core runs on both sides of the boundary.

**Governing principles**
- *Make the right thing easy, not the wrong thing impossible.* Type safety is opt-in with a
  loose fallback; enforcement is the app's lint policy, not baked irreversibly into the core.
- *Build hard logic once.* Field arrays, list controllers, validation — in the neutral core.
- *Inject, don't own.* Router and data-runtime are providers, so the same hooks run SPA, SSR,
  or RSC. "Where it runs" is a deployment choice, not baked into the hook.

---

## 3. Non-goals (v1)

- **No Vue/Svelte adapters in v1.** The architecture *permits* them (boundary lint-enforced);
  we don't *build* them until demanded. (Amended: `@chelone/vue` is built, see §12.)
- **Not RSC-first end-to-end.** Admin is inherently interactive; RSC wins the read path, not
  the whole app. (Amended: RSC scope, see §12.)
- **No ra-enterprise gap-fill in v1.** (AccordionForm, LongForm, MultiLevelMenu,
  ReferenceManyInput, DualListInput, RBAC enforcement — deferred to post-parity.) (Amended: realtime and record locks are built, see §12.)
- **Not a backend or ORM.** The core depends on **Zod only**; Drizzle/Prisma are reference
  integrations, not dependencies.

---

## 4. Decision record (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Build strategy | **Greenfield** new repo. Copy website+docs+demo wholesale; components = rebridge reference; clean-room the core; park shadmin. |
| 2 | Deployment ceiling | Framework-agnostic core + **TanStack Start** recommended default. SSR/RSC via server data-entry. Server-shell + client-islands. |
| 3 | Agnostic scope | **React-first.** Core↔adapter boundary **lint-enforced**. Vue/Svelte possible. Amended: Vue is built, see §12. |
| 4 | Substrate | **TanStack** everything: Query (`query-core`) · Router (adapter) · Form (`form-core`) · Start (reference). |
| 5 | Form state | **TanStack Form** in the vanilla core. No react-hook-form. |
| 6 | Type model | **Zod resource registry, opt-in + loose fallback.** Non-`any` base record. Typed-by-default in practice. |
| 7 | IP | Clean-room core from this spec. Carried react-admin-derived components keep MIT attribution. |

---

## 5. Architecture

### 5.1 Package topology

```
chelone/ (monorepo)
  packages/
    @chelone/core        vanilla TS — NO react import (lint-enforced)
      ├─ resource/       defineResources, Zod registry, resource→type inference
      ├─ data/           DataProvider contract on @tanstack/query-core; adapters
      ├─ store/          vanilla reactive store (useSyncExternalStore-ready snapshot)
      ├─ i18n/           reactive locale state + typed message keys
      ├─ controllers/    list/edit/create/show as framework-neutral observable stores
      ├─ form/           @tanstack/form-core integration + Zod validation
      ├─ auth/           AuthProvider contract + access-control (CASL-style adapter)
      └─ router/         RouterProvider interface (no router owned)
    @chelone/react       React adapter — hooks bridge core stores via useSyncExternalStore;
                         the shadcn components (rebridged from shadmin); router default adapters
    @chelone/start       (post-v1) server data-entry: createServerFn dataProvider, dehydrate/
                         hydrate, Drizzle+drizzle-zod reference
    @chelone/vue         (later; built ahead of v1, see §12) — proves the boundary held
  apps/
    website              landing + docs + demo (copied wholesale from shadmin), CONSUMES packages
```

### 5.2 The boundary rule (lint-enforced)

`@chelone/core` **may** import `@tanstack/query-core`, `@tanstack/form-core`, `zod`, `dot.paths`
(types-only, so a `dependencies` entry: core's published `.d.ts` imports it). It **may
not** import `react`, `react-dom`, `react-hook-form`, or `react-router`. A Biome
`noRestrictedImports` rule (the same mechanism shadmin uses for its ra-core seam) enforces this
in CI. **This one rule is what keeps Vue/Svelte possible without building them.** (Amended: the
rule also bans React imports in the Vue adapter, through the `packages/core/**` and
`packages/vue/**` overrides in `biome.json`, see §12.)

### 5.3 Core subsystems

| Subsystem | Design | Keep from ra-core | Replace |
|-----------|--------|-------------------|---------|
| **Resource registry** | `defineResources({ posts: postSchema })` → typed registry. Resource name literal → record type inference. Opt-in: no schema = loose fallback. | The `<Resource>` declarative model + definition registry. | `RaRecord extends Record<string, any>` → strict base (`unknown` index). |
| **Data** | `DataProvider` contract (9 promise CRUD verbs) on `@tanstack/query-core`. Query-key scheme `[resource, op, params]`. Server-callable (no React/browser coupling). Adapters: server-fn (default), REST, GraphQL. | The contract + query-key conventions + cache cross-population + mutation modes. | Proxy-only/context-only access → add a server data entry (dehydrate/hydrate). |
| **Store** | Vanilla reactive store with `useSyncExternalStore`-compatible snapshot + server snapshot. No import-time `window`. | `getItem/setItem/subscribe` shape. | `useState`-subscribe → `useSyncExternalStore`; import-time localStorage branch → SSR-safe adapter. |
| **i18n** | Reactive locale state, **typed message keys** (`as const` → literal union + interpolation typing), server-renderable `t()`. Polyglot/i18next as the engine (amended: core's own engine, see §12). | Polyglot's `smart_count` plural name; the engine itself is core's own (amended, see §12). | Imperative-closure + full-remount-on-locale-change (`key` bump) + untyped keys. |
| **Controllers** | `list/edit/create/show` as **framework-neutral observable stores** (pagination, sort, filter, selection, URL/store sync, auth gating). React adapter bridges via `useSyncExternalStore`. | The orchestration logic (hundreds of edge-case fixes). | React-hook packaging → vanilla store + adapter. |
| **Form** | `@tanstack/form-core` for form state. Field arrays, iterators, translatable inputs built **once** in core. Zod validation. | — | react-hook-form entirely. |
| **Auth** | `AuthProvider` contract + a **free** access-control provider (CASL-style adapter). | The contract + query-wrapped hooks. | Un-paywall RBAC (it's Enterprise in react-admin). |
| **Router** | `RouterProvider` **interface**, never owned. Default react-router adapter + TanStack Router slot. SSR-capable default (real paths, not HashRouter). | The interface (already abstracted). | HashRouter default; `window.location.href` redirects → router-routed. |
| **Server data-entry** | `DataProvider` calls + React-Query dehydrate/hydrate for RSC/loaders. `createServerFn` adapter. | — | Add (ra-core has no server-callable data path). |

### 5.4 The React adapter (`@chelone/react`)

- Hooks (`useList`, `useRecord`, `useInput`, …) bridge core stores to React via
  `useSyncExternalStore`.
- The shadcn components (rebridged from shadmin's 348 items) — same UI surface, new internals
  pointed at `@chelone/core`.
- The **children-composable `<Admin>`** (the slot façade): `<Admin><AdminSidebar/>
  <AdminLogin/>…</Admin>` authored as JSX children, hoisted to the router-level props
  internally via an `raName`-style marker partition. `title`/`error`/`layout` become children
  trivially; routed pages (login, dashboard, 404) hoist via the façade.

> **Note:** the React adapter API will *differ* from ra-core's (clean-room v1). Acceptable —
> no back-compat is owed (only consumer is us).

---

## 6. The port / mine plan (shadmin as reference)

| Action | What | Why |
|--------|------|-----|
| **Copy wholesale** | website + docs + demo | "Absolute cinema" — carries forward as-is, retuned to consume `@chelone/*`. |
| **Rebridge** | the 348 components | Surface preserved, internals rewritten against `@chelone/core` + TanStack Form. Read the shadmin impl per component to carry the *subtle* edge-case fixes, not just the surface. |
| **Rebuild clean** | registry pipeline, build tooling | The gnarliest scaffolding; rebuild rather than copy (a feature). |
| **Clean-room** | `@chelone/core` | Written from this spec, **not** copied from ra-core → core IP is fully ours. |

> **IP discipline:** keep the clean-room core separate from copied components. Copied
> react-admin-derived component code keeps its MIT attribution; the from-scratch core does not.

---

## 7. Phasing

Each phase ships green and dogfoods against the (copied) reference components.

- **P0 — Scaffold.** `chelonejs` org, `@chelone` npm scope, `chelone.dev`. Clean tooling
  (pnpm + turbo, Biome, the boundary lint rule). Empty `@chelone/core` + `@chelone/react`.
- **P1 — Type foundation.** Strict base record (rename from `RaRecord`), `Identifier`,
  `DataProvider` types, the Zod resource registry + resource→type inference. Additive,
  unblocks `.d.ts` compatibility cheaply.
- **P2 — Data.** `DataProvider` on `query-core`; React adapter hooks (`useGetList`/`useGetOne`/
  mutations); a test/fake dataProvider. Validate query-key + cache conventions.
- **P3 — Store, i18n, auth.** The self-contained provider-backed services. SSR-safe store;
  typed message keys; `AuthProvider` + free access-control (CASL-style) hooks.
- **P4 — Controllers.** `list/edit/create/show` as vanilla stores + React bridges. **Validate
  the store-+-adapter pattern end-to-end on ONE resource before scaling** (this is the hardest
  lift — de-risk it here).
- **P5 — Form.** `@tanstack/form-core` + rebridge the inputs and form layouts.
- **P6 — Shell + router + server-entry.** Router adapter; children-composable `<Admin>` façade;
  server data-entry (dehydrate/hydrate, `createServerFn` adapter).
- **P7 — Reference app.** Copy website/docs/demo; rebuild the registry pipeline; wire the app
  as a consumer of the published packages.
- **Post-v1.** ra-enterprise gap-fill; `@chelone/start` reference stack; Vue/Svelte adapter (amended: the Vue adapter is built, see §12).

---

## 8. v1 scope line

- **v1 = ra-core parity on the Chelone core** — everything shadmin does today, rebuilt clean on
  `@chelone/core`.
- **Deferred post-v1:** ra-enterprise gap-fill (AccordionForm, LongForm, MultiLevelMenu,
  ReferenceManyInput, DualListInput, RBAC enforcement) and any 2nd-framework adapter (amended: the Vue adapter is built, see §12).

---

## 9. Brand & assets

- **Name:** Chelone. **npm:** `chelone` + `@chelone/*` (free). **GitHub org:** `chelonejs`
  (bare handle held by a dormant user; pursue via trademark later only if it matters).
  **Domain:** `chelone.dev` (appears free — confirm at registrar).
- **Immediate land-grabs (before squatters notice):** register `chelone.dev`, claim the
  `@chelone` npm scope + a placeholder `chelone` package, create the `chelonejs` GitHub org.
- **shadmin parking (deferred, ~half-day):** green CI · README pointing to Chelone · final tag
  (`v0-final`) · leave `shadmin-core` as-is · don't touch the build tooling.

---

## 10. Risks & open questions

| Risk | Mitigation |
|------|------------|
| Controllers-as-vanilla-stores is the hardest, least-proven lift. | Validate the pattern end-to-end on ONE resource in P4 before scaling. |
| TanStack Start RSC maturity is newer/evolving. | Validate against current docs before committing the RSC path; `@chelone/start` is post-v1. |
| "Rebridge 348 components" is the same labor as in-place — greenfield doesn't reduce it. | Budgeted as such; the win is no compat burden, not less work. |
| GitHub bare handle unavailable. | `chelonejs` now; trademark route later if warranted. |

---

## 11. Community-pain addendum (2026-06-23)

A six-modality sweep of real-user react-admin gripes (GitHub issues, exodus posts, Reddit, HN,
StackOverflow clusters, EE/licensing sentiment) was gap-checked against this charter. Full
report: kept with the planning notes, not in this repo.

**Verdict:** the four pillars MOOT or ADDRESS the loudest structural gripes (MUI coupling,
router lock-in, weak types, SPA-only, form-lib churn). The blind spots are contract-shape
decisions — cheap now, expensive later. They become phase commitments:

| Blind spot (gripe #) | Phase commitment |
|---|---|
| Cursor/keyset pagination (#5) | **P2:** pagination is a discriminated union (`page/perPage` \| `cursor/limit`) in the DataProvider contract from day one. |
| Optimistic default surprise + `Date`→string corruption (#12) | **P2:** default mutation mode = **pessimistic** (least surprise); optimistic snapshots via `structuredClone` (type-preserving). |
| `exports` maps + hard-pinned deps (#9, #10) | **P2:** correct `exports` fields; TanStack libs as **peer ranges**, never pinned deps. |
| Server-validation surfacing + form↔cache reconciliation (#4, #13) | **P2** defines the typed field-error shape on mutations; **P5** maps it onto TanStack Form state. |
| Non-`id` reference keys (#16) | **P4/P5:** reference controllers resolve via `getList` filter when the lookup key isn't `id`; `getManyReference.target` covers the FK-on-child case. |
| Scalar-array form fields + row-index exposure (#20) | **P5:** field-array primitive supports `string[]`/`number[]` element mode and passes `index`/`name` to row children. |
| Large-form performance (#4) | **P5:** explicit perf budget + field-level subscription isolation, acceptance-tested on one big form. |
| Auth edge flows: token refresh, no-flash SSR gate, forgot-password (#14) | **P3/P6:** shaped into the auth contract + shell slots. |
| Multi-sort, a11y table semantics (#19) | **P4/P7:** named v1 free-tier commitments. |
| Semver/deprecation + registry-diff upgrade policy (#3, #22) | **P7/docs:** semver contract for `@chelone/core`, diff/codemod story for registry components, changelog discipline. |
| Docs onboarding: 5-min quickstart, "point at a Zod schema, get 95%" (#22) | **P7/docs:** first-class deliverable, not an afterthought. |
| EE-parity features refugees expect (M2M, saved prefs, audit-log, edit-in-modal) (#1) | Stays **post-v1** (§3) — but the roadmap says so loudly to set expectations. |

---

## Appendix — recon sources

Findings backing this charter (build tooling, slot pattern, ra-core surface, ra-core internals,
portfolio inventory, ra-enterprise gap, modern landscape) were gathered 2026-06-23 across the
shadmin and react-admin repos plus web research. See the brainstorming session transcript.

---

## 12. Amendments (2026-11-08)

The decision record (§4) is amended, not rewritten, so its history stays readable. Where a
section above is out of date, it carries a pointer here.

- **`@chelone/vue` is built.** It was built ahead of the v1 non-goal in §3, and the boundary
  held: core takes no React imports. Design: `docs/vue-adapter-design.md`. Gaps against
  `ra-core`: `docs/parity-report.md`. Svelte is not started.
- **The boundary rule covers core and the Vue adapter.** `biome.json` has two
  `noRestrictedImports` overrides: `packages/core/**` (no React or router imports) and
  `packages/vue/**` (no React, `react-router`, or `@chelone/react`). Both adapters subscribe to
  core independently. Two gaps: there is no override for `packages/react/**`, so nothing lints
  that package against Vue imports; and Biome lints only `.ts`, `.tsx` and JSON files, so a
  `.vue` component is not checked by these overrides and `vue-tsc` does not enforce them.
- **i18n uses core's own engine.** Core interpolates messages itself instead of using Polyglot or
  i18next, and keeps Polyglot's `smart_count` name for plural counts. Core still depends on Zod
  only (§3), so that rule holds.
- **Realtime and record locks moved into v1 scope (2026-10-31).** They were ra-enterprise
  gap-fill, deferred in §3. The engine (transport, `realtimeDataProvider`, lock provider) is in
  `@chelone/core`, framework-free, and `@chelone/react` and `@chelone/vue` both expose live
  hooks, live views and `LockOnMount`/`LockStatus`. Audit-log, ra-tree and calendar stay
  deferred. Guide: `apps/website/src/docs/content/app-config/realtime.mdx`.
- **RSC covers the read path only (2026-11-08).** `<ServerShow>` and `<ServerList>` in
  `@chelone/react/rsc` render as server components on TanStack Start. `<ServerList>` sorts,
  pages and filters through the URL. A row mutation refreshes it with `router.invalidate()`.
  Undoable and optimistic lists, inline edit, polling and every form stay client-rendered.
  Undo, optimistic updates and mutation side effects all run through the react-query cache.
  Server-rendered output never enters that cache, so a server list can only refresh after the
  server answers.
