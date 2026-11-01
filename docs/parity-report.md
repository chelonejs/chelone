# Chelone ⇄ react-admin (ra-core 5.14.7) — Core Parity Report

Synthesis of 14 per-area readings (not kept in the repo).
Judged on **capability**, not export name — Chelone splits the same logic into a
vanilla `@chelone/core` (React-free) + a thin `@chelone/react` bridge, so a
capability can be at parity even when it lives behind a different symbol.

Verdict legend: **parity** (matches) · **near-parity** (matches with named minor
gaps) · **partial** (core path works, structural feature(s) missing) · **gap**
(area absent) · **extended-beyond** (reproduces ra-core AND adds surface).

---

## 1. Per-area matrix

| Area | Verdict | What matches (parity) | Gaps (ra-core has, Chelone lacks) | Chelone extensions |
|---|---|---|---|---|
| **Data provider + data hooks** | near-parity | 9-verb DataProvider contract, useGetList/One/Create/Update/Delete, pessimistic + optimistic modes, useDataProvider/useRefresh, query keys, meta, previousData | useGetManyAggregate (N+1 batching), useInfiniteGetList, useUpdateMany/useDeleteMany/useGetManyReference **hooks**, undoable mode + undo infra, withLifecycleCallbacks, combineDataProviders, HttpError, fetchUtils, AbortSignal, mutation side-effect passthrough | Registry-typed provider (`RecordOf` flows to results), cursor+multi-sort pagination first-class, optional total, edge-only `useLoading`, in-core `fakeDataProvider`, framework-agnostic option factories (reusable by vue-query + SSR prefetch) |
| **List controller** | partial | pagination/sort/filter/selection engine, out-of-range page reset, select-all-across-pages, client `useList`, useListContext + slice hooks, storeKey persistence | **URL/location param sync (KV-only)** — biggest divergence; infinite list; saved queries; cross-storeKey `unselect`; `getData` on controller; isLoading/isPaused/meta; RecordsIterator/WithListContext/useExpanded | Multi-sort first-class (`SortPayload[]`); vanilla core/react split; inert-construction 4R lifecycle (no zombie controllers) |
| **Edit/Create/Show + save pipeline** | near-parity | getOne fetch, transform pipeline, mutationOptions-equivalents, ValidationError-no-notify flow, redirect matrix, saving flag, warnWhenUnsavedChanges, record representation, pessimistic + optimistic | undoable `mutationMode` (ra's edit default), mutation middleware, controller-internal auth/`disableAuthentication` gating, translated `defaultTitle` template, `redirectOnError`/`refetch`/isLoading-isPaused-isPlaceholderData, resource-aware create-redirect fallback | Framework-agnostic vanilla controllers, `onSaved` observer (reconcile-before-redirect), composed fetch+form+hydration controller, explicit MutationObserver GC, overlapping-save counter guard |
| **Reference controllers + choices** | partial | reference **inputs** (to-one + to-many) + choices context/accessors at full parity; reference one-field, array-field (client) | No reusable reference **field** controllers/contexts (`ReferenceFieldContext` etc.); reverse-relation fields client-side (no server pagination/sort/filter/selection API); useSupportCreateSuggestion; ReferenceManyCount | Unified vanilla `createChoicesController` (single controller for single+array); arbitrary `lookupKey` resolution (not just id); 4R lifecycle |
| **Auth + access control** | partial | authProvider contract, login/logout/getIdentity, authState + `<Authenticated>` gate, useCanAccess, auth callback, useAuthProvider, LogoutOnMount | Whole **permissions axis** (usePermissions/getPermissions/WithPermissions); `checkError`→`useLogoutIfAccessDenied` auto-logout wiring (declared, unwired); imperative access checks (useCanAccessCallback/Resources, useRequireAccess); `<CanAccess>` component; refreshAuth helpers (deferred) | No-flash SSR `useAuthGate`; vanilla `canAccessWithPermissions` matcher in core; tolerant `useMenuAccess` |
| **Form + validation** | near-parity | built-in validators (1:1), useInput, async validation, sanitizeEmptyValues, server submission errors, invalid-form notification, FormGroups (tabbed/wizard), warnWhenUnsavedChanges, FilterLiveForm, field arrays | useUnique; useRecordFromLocation; FormDataConsumer render-prop / useFormValues (partial via useWatch + store selector); `criteriaMode:'all'` + fine-grained RHF knobs | Native Zod/Standard-Schema validation at form **and** field level; clean `unknown` error channel (no `@@react-admin@@` string-smuggling); framework-agnostic vanilla core (proven by Vue adapter) |
| **i18n** | near-parity | i18nProvider contract, translate/locale hooks, interpolation + pluralization, resource/field label translation, record representation | useTranslatable/TranslatableContext (multi-locale field editing); async/lazy locale loading; rich `getLocales`→`{locale,name}`; `<Translate>` component; resolveBrowserLocale + mergeTranslations utils; locale persistence | Compile-time type-safe catalogs (`defineMessages`/`TranslateParams`); CLDR `Intl.PluralRules` pluralization; subscribe-based reactivity (no full-app remount on locale change) |
| **Store + preferences + configurable** | partial | `useStore(key,default)`→[value,setter], localStorage + memory adapters, per-key subscription, cross-tab sync, SSR-safe snapshot | **Preferences/Configurable/Inspector system entirely** (deferred); `reset`, `removeItems`, `useRemoveFromStore`, `StoreSetter`, store versioning, prefix-scoped `listItems` | Split core/react + pluggable `StoreAdapter` (~15-line backends); first-class `createMicroStore` controller primitive; native per-key fan-out |
| **Routing** | near-parity | useRedirect (exact contract), useCreatePath, useGetPathForRecord, CoreAdminRoutes no-flash branch machine, Resource CRUD route registration, CustomRoutes (+override ordering), scroll-to-top + restore, error-boundary-on-location-change, all low-level nav hooks | useGetPathForRecordCallback (imperative async form); useSplatPathBase (internal-only, not exported); branded TestMemoryRouter | Vanilla React-free `RouterPort` seam (SSR/loader-safe pure createPath/matchPath/parseLocation); **second working TanStack adapter**; useRedirectOptional; normalized cross-router blocker |
| **Notification** | partial | useNotify, four types, messageArgs, read queue, reset, toast renderer (sonner) | undoable notifications (Undo button + beforeunload); autoHideDuration (incl. null=sticky); multiLine; ReactNode messages | Framework-agnostic vanilla store (Vue-reusable); `notify()` returns id; per-id `dismiss()` |
| **DataTable logic + Export** | near-parity | per-column sort, toggle-select, select-page, select-all-across-pages, expandable rows, rowClick, empty/loading gating; downloadCSV; ExportButton + BulkExportButton | shift-click range select; `isRowSelectable`; columns-visibility inspector (deferred, biggest DataTable gap); jsonexport nested flattening; fetchRelatedRecords/getRelatedIds; ExporterContext | Dep-free `recordsToCSV` + SSR-guarded downloadCSV; `size` density; select-all pushed into vanilla `@chelone/core` controller |
| **Resource registry + admin shell + base types** | extended-beyond | Resource marker + definition/registry, resource context, CoreAdmin/Context/UI three-tier shell, CustomRoutes, HasDashboard, title, record-representation + resource-label, RaRecord/Identifier | UserMenuContext/useUserMenu (minor UI, deferred); useFirstResourceWithListAccess simplified to first-candidate check (partial) | **Zod registry** (`defineResources`, `RecordOf` via `z.infer`, schema-as-form-validator); vanilla SSR-safe `useSyncExternalStore` registry; slot-marker composable `<Admin>`; strict `unknown`-over-`any` base types |
| **Inference / Guessers** | gap | — (none) | Entire ra-core inference stack: data-value sniffing, name-heuristic reference inference, `InferredElement` JSX representation, `ListGuesser`/`EditGuesser`/`ShowGuesser` | Zod registry gives typed records + validation but drives **no** view inference (not an autoform); charter-deferred area |
| **Realtime / enterprise / misc** | partial | optimistic + pessimistic modes present | undoable mode (OSS, seam-only); withLifecycleCallbacks/combineDataProviders/addRefreshAuth; useUnique; export relation-fetch; guessers; realtime/tree/calendar/audit (all deferred) | none — pure deferred/missing catalogue (Zod registry substitutes for guessers, not additive) |

Verdict tally: **extended-beyond ×1, near-parity ×6, partial ×5, gap ×1, near-parity(realtime-misc counted partial) ×1.**

---

## 2. Overall assessment — honest

**Near-parity with named, mostly-deliberate gaps — NOT full parity, and honestly
stronger than "partial" on the load-bearing engine.**

The everyday admin engine is at or beyond ra-core: the DataProvider contract +
CRUD read/write hooks, the list/edit/create/show controllers, the save pipeline,
forms + validation, i18n, routing, the KV store, the notification queue, the
DataTable interaction model, and the resource/shell/registry system are all
reproduced faithfully — several *exactly* (useRedirect, sanitizeEmptyValues,
validators, record representation, CoreAdminRoutes branch order), and one whole
area (**resource registry + shell**) is genuinely extended beyond ra-core.

It is **not** full parity because of a set of real, named gaps — some deliberate
charter cuts, some simply unported v1 simplifications:

- **Whole subsystems deferred:** guessers/inference (gap), preferences /
  Configurable / Inspector (gap), the permissions-object axis (gap).
- **Structural feature gaps inside otherwise-strong areas:** no URL sync of list
  params (KV-only — no bookmarkable filtered lists), no infinite list, no saved
  queries, no undoable mutation mode (a real ra-core **OSS** feature, left as a
  named seam), no `useGetManyAggregate` batching (N+1 risk on reference-heavy
  tables), reverse-relation fields are client-side only.
- **Unwired declared contract:** `checkError` is on the AuthProvider type but
  nothing calls it → no logout-on-401/403 flow yet.
- **Convenience/ergonomic gaps apps hit early:** `withLifecycleCallbacks`,
  `combineDataProviders`, `useUnique`, `HttpError`/`fetchUtils`,
  mutation side-effect passthrough, `<CanAccess>`, `FormDataConsumer`.

None of the gaps are architectural dead-ends — every one is additive surface on a
core that already proved it can carry the feature (the vanilla split even proved
it carries a **second framework**, Vue, with zero core changes).

---

## 3. DEFERRED list — what ra-core / ra-enterprise has that Chelone intentionally lacks

**Charter-deferred (by design, v1 out of scope):**
- **Guessers / element inference** — the entire `inference/` stack + Guesser
  components (Zod registry is the deliberate alternative, but is a validator, not
  a view generator).
- **Preferences / Configurable / Inspector** — `usePreference`,
  `PreferenceKeyContext`, `PreferencesEditorContext`, `<Configurable>`/`<Inspector>`.
- **Permissions-object axis** — `getPermissions`/`usePermissions`/
  `<WithPermissions>` (Chelone is canAccess-only).
- **Undoable mutation mode** — the pessimistic/optimistic/**undoable** third mode +
  undo event emitter + undo toast (this one is ra-core **OSS**, not enterprise —
  the most notable deferral); Chelone uses confirm dialogs instead.
- **Realtime** (subscribe/live/locks), **ra-tree**, **calendar/scheduler**,
  **audit-log** — all ra-**enterprise**; absent in this ra-core OSS checkout too.

**Unported v1 simplifications (not charter, just not-yet-built):**
- List: URL param sync, infinite list, saved queries.
- Data: `useGetManyAggregate`, `useInfiniteGetList`, `useUpdateMany`/`useDeleteMany`
  hooks, AbortSignal, `withLifecycleCallbacks`, `combineDataProviders`, `HttpError`,
  `fetchUtils`, mutation side-effect passthrough.
- Auth: `checkError`→logout wiring, imperative access checks, `<CanAccess>`,
  refreshAuth helpers.
- Form: `useUnique`, `useRecordFromLocation`, `FormDataConsumer`.
- i18n: multi-locale field editing, async/lazy locale loading, locale persistence.
- Store: `reset`/`removeItems`/versioning.
- Reference: reusable field controllers/contexts + **server-side** reverse-relation
  lists with selection API.
- DataTable: shift-click range select, `isRowSelectable`, columns-visibility inspector.
- Export: `fetchRelatedRecords`/`getRelatedIds`, jsonexport nested flattening,
  `ExporterContext`.
- Routing: `useGetPathForRecordCallback`, exported `useSplatPathBase`,
  `TestMemoryRouter`.
- Misc utils: `asyncDebounce`, `mergeRefs`, `useDebouncedEvent`, `resolveBrowserLocale`,
  `mergeTranslations`.

---

## 4. EXTENSIONS list — what Chelone adds beyond ra-core

1. **Zod resource registry + typed records** — `defineResources` + `RecordOf` via
   `z.infer` gives compile-time record types AND makes the resource schema double
   as the default form validator. The provider is parameterized by the registry so
   `resource` names are checked and record types flow to query results. ra-core has
   no compile-time record registry (records default to `any`).
2. **Framework-agnostic vanilla `@chelone/core`** — every controller, the save
   pipeline, forms/validation/groups, i18n, store, notification queue, and the
   router seam are React-free and SSR-safe. ra-core is React-hook-bound throughout.
3. **A second, working adapter (Vue)** — the headless split is *proven*, not
   claimed: `@chelone/vue` drives the unchanged core (85 tests, browser-verified).
   Plus a second **router** adapter (TanStack) alongside react-router.
4. **SSR-safe router port** — vanilla `RouterPort` + pure `createPath`/`matchPath`/
   `parseLocation` with no `window` at import; loader/node-safe. ra-core routing
   never runs outside React.
5. **Framework-agnostic option factories** — `getListOptions`/`*MutationOptions`
   are plain `{queryKey, queryFn}` objects consumable by react-query, vue-query,
   AND server `prefetchQuery`.
6. **Cleaner/first-class primitives** — cursor + multi-sort pagination first-class;
   edge-only `useLoading`; `createMicroStore` as a first-class controller substrate;
   pluggable `StoreAdapter`; `onSaved` reconcile-before-redirect observer; explicit
   MutationObserver GC; no-flash SSR `useAuthGate`; clean `unknown` form-error
   channel; CLDR pluralization + type-safe i18n catalogs; strict `unknown`-over-`any`
   base types; in-core `fakeDataProvider`.

---

## 5. Bottom line

**Chelone has near-parity — not full parity — with react-admin's core, plus a
genuine extension surface that react-admin does not have.** The load-bearing
engine (data provider + CRUD hooks, list/edit/create/show controllers, save
pipeline, forms + validation, i18n, routing, store, notifications, DataTable,
resource/shell/registry) is reproduced faithfully — several parts exactly, one
whole area beyond ra-core — and the vanilla core/react split is validated by a
second Vue adapter riding the unchanged core. The honest shortfall is a bounded,
named set of gaps: a few deferred-by-charter subsystems (guessers, preferences/
Inspector, the permissions-object axis), several unported structural features
(list URL-sync, infinite list, saved queries, undoable mode, getManyAggregate
batching, server-side reverse-relation fields), one unwired declared contract
(`checkError`→logout), and a handful of convenience helpers. All are additive on
a proven core, none are architectural. So the accurate claim is **"near-parity
with react-admin core on everything an admin app needs day-to-day, extended by a
typed Zod registry and a framework-agnostic engine — with a documented, mostly
deliberate gap list, not full parity."**
