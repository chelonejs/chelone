# Chelone — ra-core Parity Roadmap (post-v1)

**Date:** 2026-07-10 · Derived from the parity analysis ([`parity-report.md`](parity-report.md)) vs react-admin `ra-core` 5.14.7.

**State:** near-parity on ra-core's load-bearing surface (data/list/edit/create/show/form/i18n/routing/notification/DataTable/shell) + architectural extension (Zod registry, framework-agnostic core proven by the Vue adapter). NOT full feature parity — a bounded, mostly-deliberate gap list. This roadmap prioritizes closing it.

**Prioritization = user-facing value ÷ effort, honoring the thesis (keep core framework-agnostic; every gap closed must stay zero-React-in-core and land in BOTH adapters or in vanilla core).**

## Tier 1 — high value, bounded (do next)

### R1. URL-synced / bookmarkable lists ⭐ (STARTING NOW)
- **Gap:** Chelone list params (filter/sort/page/perPage) are KV-only; not reflected in the URL. react-admin's `useListParams` syncs them to the location query string (`?filter=…&sort=…&page=…`), so list state is bookmarkable/shareable/back-button-aware. A staple react-admin UX.
- **Design (Chelone-idiomatic, thesis-safe):** pure `listParams ⇄ querystring` serializer in `@chelone/core` (no router — `serializeListParams`/`parseListParams`, mirroring ra-core's `parseQueryFromLocation`/stringify). The *adapter* (`@chelone/react` + `@chelone/vue` `useListController`) wires that serializer to its RouterPort/router (read initial params from the location, push param changes to the URL), gated by a `syncWithLocation`/`disableSyncWithLocation` option (off for embedded lists). Core list controller stays router-free.
- **Effort:** M. Reference: ra-core `controller/list/useListParams.ts` + `queryReducer`.

### R2. Permissions / access-control axis 🔒
- **Gap:** auth *identity* works (login/logout/getIdentity/authState), but the PERMISSIONS layer is partial/unwired: `usePermissions`/`getPermissions`, `canAccess`/`useCanAccess`/`CanAccess`, `checkError`→auto-logout (`useLogoutIfAccessDenied`), resource/action access gating in controllers.
- **Design:** the `canAccessWithPermissions` matcher already exists vanilla in core — extend: add `usePermissions`/`useCanAccess` composables (both adapters) over the authProvider `getPermissions`/`canAccess`; wire `checkError`→logout into the data/mutation error path; gate menu items + view actions on access (the menu already tolerantly hides — make it access-driven). Security-adjacent → do carefully.
- **Effort:** M.

### R3. Undoable mutation mode ↩️
- **Gap:** react-admin's signature optimistic-with-Undo flow (mutationMode `undoable`): mutate optimistically, show a notification with an Undo button + a delay, commit on timeout / revert on undo. Chelone has the seam (mutationMode plumbing) but not the flow, nor undoable notifications (Undo button, autoHideDuration, beforeunload guard).
- **Design:** add the undoable mutation queue in core (vanilla: a deferred-commit registry with commit/undo), + the adapter notification with an Undo action + timer. Pairs with the Notification gaps (undoable/autoHide/multiLine).
- **Effort:** M–L.

## Tier 2 — medium value (done ✅)

### R4. Infinite list + saved queries ✅
- Infinite-scroll list controller (`useInfiniteGetList` + `useInfiniteListController`) + saved queries (persist named filter/sort sets to the store). Effort M.
- **Shipped:** infinite list core #50, #55, adapters #58, `InfiniteList`/`InfinitePagination` #60; `setParams` #48; saved queries core #49, `SavedQueriesList` #61.

### R5. Data-provider power tools ✅
- `useGetManyAggregate` (N+1 → single `getMany` batching per tick — a real perf win), `useGetManyReference` hook, `withLifecycleCallbacks` (beforeGetList/afterCreate/etc.), `combineDataProviders`, `HttpError` + `fetchUtils` (a batteries-included REST helper). Effort M.
- **Shipped:** `getMany` batching #36, `useGetManyAggregate` #44, cache patching #46, #54; `useGetManyReference` #42; `withLifecycleCallbacks` #45; `combineDataProviders` #47; `HttpError` + `fetchUtils` #43, documented in #53.

### R6. Server-side reverse-relation fields ✅
- `useReferenceManyFieldController`/`useReferenceOneFieldController` with server pagination/sort/filter/selection. `ReferenceManyCount`. Effort M.
- **Shipped:** the reverse-relation fields page, sort, filter and select on the server through `getManyReference`. Controllers #51, #57; `ReferenceManyField` #59; `ReferenceOneField` #62; `ReferenceManyCount` #63.

## Tier 3 — deferred / lower priority (charter-deferred or niche)

### R7. Preferences / Configurable / Inspector
- The whole `usePreference` + `Configurable` + `Inspector` (in-app "customize this component" panel) system. Big, cohesive, deferred by charter. Effort L.
- **Call (#225):** kept; see "shadmin-only extras".

### R8. Guessers / inference — reframe as a Chelone EXTENSION
- ra-core's guessers sniff data values/name-heuristics to infer views. Chelone deliberately skipped them. BUT the Zod registry is a *better* substrate: a schema→view scaffolder (`z.infer` field types → default List/Edit/Show columns) would be *typed* inference, not data-sniffing — arguably surpassing ra-core. Frame as a NEW extension feature, not a port. Effort M–L.
- **Call (#225):** kept; see "shadmin-only extras".

### R9. i18n depth
- Translatable multi-locale field editing (`useTranslatable`/`TranslatableContext`), async/lazy locale loading, `resolveBrowserLocale`, `mergeTranslations`, a `<Translate>` component. Effort M.

### R10. Realtime / enterprise
- realtime (`useSubscribe`/live queries/locks), audit-log, ra-tree, calendar. Large, ecosystem-scale, deferred (was always post-v1 per the charter). Effort XL.
- **Call (#225):** tree and calendar lists dropped; see "shadmin-only extras".

## shadmin-only extras (issue #225)

shadmin ships pieces that Chelone has not built. Some are `ra-core` parity gaps (guessers, preferences, Configurable, Inspector: R7 and R8, see the parity report), so building them closes those gaps. The rest are not in `ra-core` at all. Each gets a call: kept (built as slices) or dropped. The test: does it belong in a headless admin engine, does it fit the Zod registry and the framework-free core, and can it ship without a backend the project does not own (charter §3).

### Kept

Slice order follows the parity rule: shared behaviour lands in vanilla core first, then each adapter reads it. A piece with no core logic lands in both adapters in the same pull request.

| Piece | Call | Slices |
|---|---|---|
| `ListGuesser`, `EditGuesser`, `ShowGuesser` | Keep. Drive them from the Zod registry (typed inference), not from sniffing data values. Same work as R8. | Core: registry schema to field descriptors. Then React guessers, then Vue guessers. |
| `ColumnsButton` | Keep. Closes the biggest DataTable gap in the parity report. Needs `usePreference` on the existing store. | Core: preference store keys. Then React `ColumnsButton`, then Vue. |
| Inspector and `Configurable` | Keep, after `ColumnsButton`. Same system as R7. | Core: preference editor state (which keys a component exposes, edit mode on or off). Then React `Configurable` + `Inspector`, then Vue. |
| `SimpleFormConfigurable` | Keep, after `Configurable`. Reuses the Inspector. | Core: form preference keys. Then React, then Vue. |
| Command menu (widget) | Keep. Navigates the resource registry and honours access control, so it is engine-shaped. | Core: searchable list of resources the user can access. Then React, then Vue. |
| Data provider devtools (widget) | Keep. Shows the calls a data provider makes, to debug an app. No call log exists yet. | Core: a call-log wrapper around the data provider. Then React panel, then Vue. |

### Dropped

| Piece | Why |
|---|---|
| Tree and calendar lists | Ecosystem-scale (R10), same class as ra-enterprise (charter §3). No consumer asked for them. Reopen with a concrete resource shape. |
| Collaboration: presence bar, comment threads | Needs realtime transport and storage. Chelone is not a backend (charter §3). Realtime stays in R10. |
| Approval buttons: dual approval, status transitions | Domain workflow. An app builds it from `useUpdate` and `useCanAccess`. A generic version would encode one workflow. |
| Kanban board, pivot grid, record timeline, diff viewer, in-place editor | App-level views, not engine parts. Each needs its own design and a heavy dependency. File one issue per widget if a consumer needs it. |
| Permission matrix, approval queue, job monitor | Tied to a specific backend or workflow model. R2 covers the access axis they would sit on. |
| Dashboard charts | A chart library choice belongs to the app. |
| Theme studio, layout builder | Design tooling. The shadcn registry already lets an app own its theme and layout source. |
| Onboarding tour | Product-specific, with a third-party dependency. |
| i18n key editor | A translation workflow tool. R9 covers the i18n depth the engine needs. |
| Assistant | Needs a model backend and prompts. Out of scope for a headless engine. |

Dropped pieces can come back through a new issue that names a consumer.

## Sequencing

**STATUS 2026-07-10 — TIER 1 COMPLETE. ✅ R1 URL-synced lists · ✅ R2 permissions/access-control · ✅ R3 undoable mutations.** All three closed in BOTH adapters, core stayed framework-free (external react/vue/router import grep = empty across all additions), core 590 / react 1241 / vue 493 green, vue-demo builds. R1 browser-verified (deep-link seed + page-push). R2 security semantics verified both directions (checkError-reject→logout, resolve→stay; fail-open-when-unconfigured). R3 data-integrity verified by spy counts (server 0× on undo, 1× on commit; rollback on undo + commit-error; beforeunload commit). The gate that held: parity work ADDS to core (additive vanilla), invariant = core stays REACT/framework-FREE, not zero-core-change.

**STATUS — TIER 2 COMPLETE. ✅ R4 infinite list + saved queries · ✅ R5 data-provider power tools · ✅ R6 server-side reverse-relation fields.** Each landed in both adapters on the framework-free core; PRs are listed under each item.

**Next:** Tier 3 stays deferred, except R7 and R8, which #225 keeps (slices to be filed), and the tree and calendar part of R10, which #225 drops. The Vue registry (V4, see [`vue-adapter-design.md`](vue-adapter-design.md)) shipped. The remaining open v1 work is the first npm release (#8).
