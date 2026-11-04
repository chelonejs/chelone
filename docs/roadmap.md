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
- Planned. The inspector, `Configurable` and `SimpleFormConfigurable` are not built, and `ColumnsButton` covers the usual reason for them. See [Shadmin extras (#225)](#shadmin-extras-225).

### R8. Guessers / inference — reframe as a Chelone EXTENSION
- ra-core's guessers sniff data values/name-heuristics to infer views. Chelone deliberately skipped them. BUT the Zod registry is a *better* substrate: a schema→view scaffolder (`z.infer` field types → default List/Edit/Show columns) would be *typed* inference, not data-sniffing — arguably surpassing ra-core. Frame as a NEW extension feature, not a port. Effort M–L. The guessers are tracked in #225, see [Shadmin extras (#225)](#shadmin-extras-225).

### R9. i18n depth
- **Deferred:** async/lazy locale loading, `getLocales`, `resolveBrowserLocale`, `mergeTranslations`, a `<Translate>` component. Effort M.
- **Shipped:** translatable inputs and fields in both adapters (`TranslatableInputs`, `TranslatableFields`, `useTranslatable` and the translatable context), on the framework-free `createTranslatableController` in `@chelone/core`. Guides: `apps/website/src/docs/content/editing/translatable-inputs/index.mdx` and `apps/website/src/docs/content/viewing/translatable-fields/index.mdx`.

### R10. Realtime / enterprise
- **Realtime, live views and record locks are built in both adapters** (the engine is in `@chelone/core`; `useSubscribe`, `ListLive`/`ShowLive`/`EditLive`/`MenuLive`, `LockOnMount`/`LockStatus` in React and Vue; both demos wire it). Guide: `apps/website/src/docs/content/app-config/realtime.mdx`.
- Still deferred: audit-log. Large, ecosystem-scale, post-v1. Tree list and calendar list moved to [Shadmin extras (#225)](#shadmin-extras-225).

## Opt-in add-ons (#224)

Heavy editors and integrations ship as opt-in subpaths, so an app that does not use one never installs its dependencies. Each add-on lands in both adapters. The registry marks the dependencies as optional peers (#393, shared by every add-on).

- **Maps** (in progress): map fields and inputs on MapLibre with Terra Draw. Imports from `@chelone/react/maps`, `@chelone/react/maps/draw` and `@chelone/react/maps/osm`, and the same three under `@chelone/vue`. Issues #388 to #392 and #444 to #466.
- **JSON editing** (in progress): `JsonField` in the base adapters, and `MonacoJsonInput` and `MonacoJsonField` from `/monaco`. Issues #394 to #401.
- **Markdown** (in progress): `MdxInput` and `MdxField` from `/mdx-editor`. Issues #402 to #406.
- **CSV import** (in progress): `CsvImport` and `useCsvImport` from `/csv-import`. Issues #407 to #411 and #424.
- **Supabase** (in progress): the `@chelone/supabase` package, and the `/supabase` subpath for the login, reset and set password pages. Issues #412 to #423, #425 and #426.
- **Block editor and tiptap rich text input** (planned): both pull in tiptap, so each is an opt-in add-on.

## Shadmin extras (#225)

Pieces of shadmin that Chelone keeps, with where each stands. Each lands in both adapters.

- **Guessers, driven by the Zod registry** (built): typed inference of default views from the schema. Issues #378 to #387.
- **`ColumnsButton`** (built): lets a user choose which list columns show. Issues #427 to #431, docs in #435.
- **Tree list** (built): a list that renders records as a tree. Issues #432 to #434, docs in #435.
- **Collaboration** (in progress): presence bar and comment threads on the realtime engine. Issues #475 to #480 and #488.
- **Approval buttons** (in progress): approve and reject actions on a record. Issues #475 and #481 to #483, docs in #489.
- **Command menu** (in progress): a keyboard-driven command palette. Issues #484 to #487 and #490.
- **Calendar list** (post-v1): a list that renders records on a calendar. Issues #436 to #443. The framework-free calendar rules in `@chelone/core` (#436) are built; the adapter components are not.
- **Kanban board** (planned): a list that renders records as columns and moves a card by dragging. Issues #790 to #794.
- **Other widgets** (planned): pivot grid, record timeline, diff viewer, in-place editor, permission matrix, approval queue, job monitor, dashboard charts, i18n key editor, layout builder, onboarding tour and the assistant. They come after the kanban board.
- **Inspector, `Configurable` and `SimpleFormConfigurable`** (planned): after the other widgets. `ColumnsButton` covers the usual reason for them.
- **Data provider devtools** (planned): after the other widgets.
- **Dropped:** theme presets and the theme studio. Theming is shadcn CSS variables, as `apps/website/src/docs/content/app-config/themes.mdx` describes.

## Adapter duplication (#669)

Every feature lives once per adapter, and the copies drift. [`headless-controllers.md`](headless-controllers.md) measures the duplication with jscpd, lists every React and Vue clone with where its logic should live, and ranks the moves into core controllers. The moves are filed from that note, each covering both adapters.

## Sequencing

**STATUS 2026-07-10 — TIER 1 COMPLETE. ✅ R1 URL-synced lists · ✅ R2 permissions/access-control · ✅ R3 undoable mutations.** All three closed in BOTH adapters, core stayed framework-free (external react/vue/router import grep = empty across all additions), core 590 / react 1241 / vue 493 green, vue-demo builds. R1 browser-verified (deep-link seed + page-push). R2 security semantics verified both directions (checkError-reject→logout, resolve→stay; fail-open-when-unconfigured). R3 data-integrity verified by spy counts (server 0× on undo, 1× on commit; rollback on undo + commit-error; beforeunload commit). The gate that held: parity work ADDS to core (additive vanilla), invariant = core stays REACT/framework-FREE, not zero-core-change.

**STATUS — TIER 2 COMPLETE. ✅ R4 infinite list + saved queries · ✅ R5 data-provider power tools · ✅ R6 server-side reverse-relation fields.** Each landed in both adapters on the framework-free core; PRs are listed under each item.

**STATUS — SHADMIN SHELL, FEEDBACK AND COMMON PIECES COMPLETE (#264). ✅ shell · ✅ feedback · ✅ common.** Each is built in BOTH adapters, as a React component and its Vue twin:
- Shell: `Layout`, `AppBar`, `AppSidebar`, `Menu` and its items, `UserMenu`, `ThemeProvider`, `ThemeModeToggle`, `HideOnScroll`, `Title`/`TitlePortal`, `SkipNavigationButton`, `LocalesMenuButton`.
- Auth pages: `LoginPage`, `LoginForm`, `LoginWithEmail` (takes an `onSubmit` for a custom backend), `AuthLayout`, `AuthCallback`, `AuthError`, `AuthenticationError`, `AccessDenied`, `Logout`, `CanAccess`.
- Feedback: `Confirm`, `Error`, `Loading`, `LoadingIndicator`, `LinearProgress`, `Notification`, `NotFound` (for the catch-all route), `Offline`, `Placeholder`, `Ready`, `Spinner`.
- Common: `Link`, `IconButtonWithTooltip`, `KeyboardShortcut`, `FieldLabelText`, `InputHelperText`, `CheckForApplicationUpdate`, `ApplicationUpdatedNotification`.

**Next:** Tier 3 (R9, and the audit-log part of R10) stays deferred. R7 is planned and R8 is tracked in #225. Realtime, live views and record locks from R10 are built. The Vue registry (V4, see [`vue-adapter-design.md`](vue-adapter-design.md)) shipped. The remaining open work is the first npm release (#8), the opt-in add-ons (#224) and the shadmin extras (#225), whose first open piece is the kanban board.
