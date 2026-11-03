# Headless controllers: what moves from the adapters into core

Every Chelone feature lives twice, once in `@chelone/react` and once in `@chelone/vue`. When the two copies drift, one of them is wrong. A Solid or Svelte adapter would add a third copy. Logic that sits in a framework-free core module, with a thin hook or composable per adapter, is written and fixed once.

This note measures how much of the adapter code is duplicated, says what each duplicate is, and ranks the moves. It changes no code. The moves land as their own issues, each covering React and Vue (see [Filing the moves](#filing-the-moves)). The maintainer files them from this note.

## How it was measured

Command, run from the repo root at `b4312c85`:

```bash
npx --yes jscpd@5.4.2 --reporters json --output <dir> --min-lines 5 --min-tokens 50 \
  --format "typescript,tsx,vue" \
  --ignore "**/*.test.*,**/*.test-d.ts,**/__fixtures__/**,**/components/ui/**" \
  packages/core/src packages/react/src packages/vue/src packages/supabase/src
```

- Version: jscpd 5.4.2.
- With only the `json` reporter the command prints one line, `JSON report saved to <dir>/jscpd-report.json`. The totals below are the `statistics.total` block of that report.
- Total: 345 clones; 5,598 duplicated lines of 114,963 (4.87%); 29,411 duplicated tokens of 527,134 (5.58%); 1,219 source files.
- By where the two sites sit:

| Sites | Clones |
|---|---|
| React and React | 146 |
| Vue and Vue | 120 |
| React and Vue | 57 |
| core and core | 19 |
| core and Vue | 1 |
| core and React | 1 |
| supabase and supabase | 1 |

- The ledger holds every clone whose two sites are in different packages: 59 rows, which is 57 React-and-Vue clones plus the 2 clones between core and an adapter. The two core rows are included because an adapter that repeats core code is the same defect.
- The 59 rows sum to 1,696 cloned lines. Overlapping clones count twice, so this is not comparable to the 5,598 total.
- Same-package clones (286 of 345) are out of scope here. Many of them are the input components repeating each other (`autocomplete-input` and `autocomplete-array-input`, `date-input` and `date-time-input`), which a core controller does not fix.

Two details of the report matter when reading it again:

- Without `--absolute`, the report names a file relative to the root it was found under, so `data/mutations.ts` could be core, React or Vue. A second run with `--absolute` added gave the same 345 clones and the same totals, and its paths attribute each site to a package.
- For a `.vue` file jscpd counts lines from the start of the `<script>` block and labels it `typescript`. The ledger adds the offset of the `<script>` tag, so every line number is a line of the real file.

## Ledger

One row per cross-package clone. Both sites are `file:start-end` from the repo root. "Lines" is the clone's length as jscpd reports it. Dispositions:

- `move to core`: pure code or types with no framework in them. One copy in core, both adapters import it.
- `controller`: logic shaped like a hook or composable, where a core controller would serve and each adapter keeps a thin shell.
- `already shared`: the logic is in core already and the clone is the framework's query call around it.
- `keep`: stays in the adapters, with the reason in the last column.

Totals: 34 `move to core` (937 cloned lines), 15 `controller` (620), 7 `keep` (77), 3 `already shared` (62). 59 rows.

| # | Site A | Site B | Lines | Disposition | Why |
|---|---|---|---|---|---|
| 1 | `packages/core/src/csv/export.ts:22-96` | `packages/vue/src/components/admin/buttons/export.ts:21-95` | 75 | `move to core` | Vue copy of `core/src/csv/export.ts`, which React already imports. Delete the Vue copy. |
| 2 | `packages/core/src/form/choices-controller.ts:62-71` | `packages/react/src/choices-hooks.ts:52-58` | 10 | `move to core` | React restates the setter list of core's `ChoicesControllerContext`. Extend the core type. |
| 3 | `packages/react/src/array-hooks.ts:69-81` | `packages/vue/src/array/use-array-input.ts:67-79` | 13 | `move to core` | Result type restates `ArrayBinding` members. Type only. |
| 4 | `packages/react/src/array-hooks.ts:86-121` | `packages/vue/src/array/use-array-input.ts:78-98` | 36 | `controller` | Binding holder, `toBindingUpdate` and the per-render update. See candidate 6. |
| 5 | `packages/react/src/array-hooks.ts:186-199` | `packages/vue/src/array/use-array-input.ts:135-148` | 14 | `keep` | Return object lists binding members; Vue needs getters, React plain values. |
| 6 | `packages/react/src/auth-hooks.ts:24-44` | `packages/vue/src/auth/auth-hooks.ts:38-59` | 21 | `already shared` | `identityQueryOptions` is in core. The rest is the `useQuery` call. |
| 7 | `packages/react/src/auth-hooks.ts:54-80` | `packages/vue/src/auth/auth-hooks.ts:69-107` | 27 | `already shared` | Mutation options are one-line wrappers over `authProvider`. Nothing to move. |
| 8 | `packages/react/src/auth-hooks.ts:109-122` | `packages/vue/src/auth/permissions-hooks.ts:63-76` | 14 | `already shared` | `permissionsQueryOptions` is in core. The rest is the `useQuery` call. |
| 9 | `packages/react/src/auth-hooks.ts:139-198` | `packages/vue/src/auth/permissions-hooks.ts:93-152` | 60 | `controller` | Logout-if-access-denied with a module-level debounce. See candidate 2. |
| 10 | `packages/react/src/auth-hooks.ts:199-231` | `packages/vue/src/auth/permissions-hooks.ts:152-184` | 33 | `controller` | Same handler, second half. See candidate 2. |
| 11 | `packages/react/src/auth-hooks.ts:237-255` | `packages/vue/src/auth/permissions-hooks.ts:188-206` | 19 | `move to core` | `isAuthQueryKey` is a pure predicate on a query key. |
| 12 | `packages/react/src/auth-hooks.ts:258-272` | `packages/vue/src/auth/permissions-hooks.ts:208-223` | 15 | `controller` | `useWatchDataErrors` subscribes to `QueryClient` caches from `@tanstack/query-core`. See candidate 2. |
| 13 | `packages/react/src/choices-hooks.ts:24-67` | `packages/vue/src/choices/choices-context.ts:20-62` | 44 | `move to core` | `ChoiceRecord`, `ChoicesContextValue` types. |
| 14 | `packages/react/src/choices-hooks.ts:52-74` | `packages/vue/src/choices/choices-context.ts:47-69` | 23 | `move to core` | Same types and `toChoiceRecord`. |
| 15 | `packages/react/src/choices-hooks.ts:74-103` | `packages/vue/src/choices/choices-context.ts:69-98` | 30 | `move to core` | `synthesizeInlineChoices` is pure. |
| 16 | `packages/react/src/choices-hooks.ts:181-191` | `packages/vue/src/choices/use-choices.ts:47-63` | 11 | `move to core` | Choice accessor defaults of `useChoices`; pure. |
| 17 | `packages/react/src/choices-hooks.ts:183-189` | `packages/vue/src/components/admin/fields/get-path.ts:11-17` | 7 | `move to core` | `getPath` over a record; pure. Vue keeps two copies of it: `fields/get-path.ts` and `choices/use-choices.ts`. |
| 18 | `packages/react/src/choices-hooks.ts:191-219` | `packages/vue/src/choices/use-choices.ts:23-47` | 29 | `move to core` | `getChoicePath` and `useChoices` accessors; pure. |
| 19 | `packages/react/src/choices-hooks.ts:254-267` | `packages/vue/src/choices/use-reference-input.ts:44-65` | 14 | `move to core` | `toChoicesContext` maps a core controller context onto the choices context; pure. |
| 20 | `packages/react/src/choices-hooks.ts:287-296` | `packages/vue/src/choices/use-reference-input.ts:65-74` | 10 | `move to core` | Same `toChoicesContext` tail. |
| 21 | `packages/react/src/components/admin/inputs/cron-utils.ts:25-31` | `packages/vue/src/components/admin/inputs/cron-utils.ts:30-36` | 7 | `move to core` | `looksLikeCron` is pure; `describeCron` needs `cronstrue`. See candidate 9. |
| 22 | `packages/react/src/components/admin/inputs/duration-utils.ts:18-28` | `packages/vue/src/components/admin/inputs/duration-utils.ts:21-31` | 11 | `move to core` | `parseIsoDuration`; pure. |
| 23 | `packages/react/src/components/admin/inputs/duration-utils.ts:33-40` | `packages/vue/src/components/admin/inputs/duration-utils.ts:34-41` | 8 | `move to core` | `compactDuration`; pure. |
| 24 | `packages/react/src/components/admin/inputs/duration-utils.ts:51-64` | `packages/vue/src/components/admin/inputs/duration-utils.ts:44-57` | 14 | `move to core` | `relativeDuration`; pure. |
| 25 | `packages/react/src/components/admin/layout/command-menu-context.ts:20-30` | `packages/vue/src/components/admin/layout/command-menu-context.ts:23-37` | 11 | `move to core` | `CommandMenuContextValue` type restates the controller surface. |
| 26 | `packages/react/src/components/admin/supabase/use-password-recovery.ts:29-141` | `packages/vue/src/components/admin/supabase/use-password-recovery.ts:38-150` | 113 | `controller` | `cleanedPath` and `stripKeys` strip tokens from the URL. They belong in `@chelone/supabase`. See candidate 3. |
| 27 | `packages/react/src/components/maps-draw/geometry-ops.ts:1-120` | `packages/vue/src/components/maps-draw/geometry-ops.ts:1-120` | 120 | `move to core` | Byte-identical. Needs `@turf/*`. See the geometry section. |
| 28 | `packages/react/src/components/maps-draw/use-terra-draw.ts:20-69` | `packages/vue/src/components/maps-draw/use-terra-draw.ts:29-78` | 50 | `move to core` | `DrawTool`, `toolMode`, `TerraDrawEdit`; pure types and a lookup. See candidate 1. |
| 29 | `packages/react/src/components/maps-draw/use-terra-draw.ts:95-224` | `packages/vue/src/components/maps-draw/use-terra-draw.ts:110-240` | 130 | `controller` | `selectFlags`, `buildModes`, `sameValue`, `userIds`. `buildModes` imports `terra-draw`. See candidate 1. |
| 30 | `packages/react/src/components/maps-draw/use-terra-draw.ts:182-189` | `packages/vue/src/components/maps-draw/shape-input.vue:94-101` | 8 | `move to core` | `sameValue` deep-equal, also pasted into `shape-input.vue`. |
| 31 | `packages/react/src/components/maps-osm/osm-features.ts:14-118` | `packages/vue/src/components/maps-osm/osm-features.ts:14-118` | 105 | `move to core` | Identical except the `QueryClient` type import. Needs `@turf/buffer` and `osm2geojson-lite`. See the geometry section. |
| 32 | `packages/react/src/components/maps-osm/osm-geometry-ops.ts:1-70` | `packages/vue/src/components/maps-osm/osm-geometry-ops.ts:1-70` | 70 | `move to core` | Byte-identical. Needs `@turf/*`. See the geometry section. |
| 33 | `packages/react/src/components/monaco/internal/strip-json-comments.ts:2-56` | `packages/vue/src/components/monaco/internal/strip-json-comments.ts:2-56` | 55 | `move to core` | Byte-identical; no imports. |
| 34 | `packages/react/src/components/monaco/internal/use-json-schema.ts:2-79` | `packages/vue/src/components/monaco/internal/use-json-schema.ts:8-86` | 78 | `controller` | Monaco diagnostics registry with module-level shared state. See candidate 4. |
| 35 | `packages/react/src/components/monaco/internal/use-json-schema.ts:88-100` | `packages/vue/src/components/monaco/internal/use-json-schema.ts:100-112` | 13 | `controller` | Same registry, tail. See candidate 4. |
| 36 | `packages/react/src/components/monaco/internal/use-json-schema.ts:100-114` | `packages/vue/src/components/monaco/internal/use-json-schema.ts:112-126` | 15 | `controller` | Same registry, tail. See candidate 4. |
| 37 | `packages/react/src/controller-hooks.ts:68-77` | `packages/vue/src/controllers/controller-context.ts:21-30` | 10 | `keep` | Maps each adapter's own `CheloneContextValue` onto core's controller context. The input type is adapter-owned. |
| 38 | `packages/react/src/controller-hooks.ts:196-208` | `packages/vue/src/controllers/use-infinite-list-controller.ts:81-93` | 13 | `keep` | Binds the same method list onto each framework's reactive shell. A core helper would save about 10 lines per hook. |
| 39 | `packages/react/src/controller-hooks.ts:200-209` | `packages/vue/src/controllers/use-list-controller.ts:156-165` | 10 | `keep` | Same method binding for the list controller. |
| 40 | `packages/react/src/controller-hooks.ts:200-209` | `packages/vue/src/list/use-list.ts:120-129` | 10 | `keep` | Same method binding for `useList`. |
| 41 | `packages/react/src/controller-hooks.ts:285-296` | `packages/vue/src/controllers/use-create-controller.ts:38-48` | 12 | `move to core` | `X & Omit<Controller, keyof MicroStore<X>>` result type, repeated per controller. One generic in core. |
| 42 | `packages/react/src/field-error.ts:1-23` | `packages/vue/src/form/field-error.ts:10-32` | 23 | `move to core` | `firstFieldError`; core already owns `normalizeFormError`. |
| 43 | `packages/react/src/field-error.ts:40-45` | `packages/vue/src/form/form-groups.ts:145-150` | 6 | `move to core` | Message equality on `TranslatableMessage`; pure. |
| 44 | `packages/react/src/form-hooks.ts:364-413` | `packages/vue/src/form/use-input.ts:74-103` | 50 | `move to core` | `extractEventValue`; pure DOM-event unwrapping. |
| 45 | `packages/react/src/hooks.ts:96-109` | `packages/vue/src/data/mutations.ts:43-62` | 14 | `controller` | `useCreate` and the start of `useUpdate`. See candidate 7. |
| 46 | `packages/react/src/hooks.ts:109-121` | `packages/vue/src/data/mutations.ts:61-74` | 13 | `controller` | `useUpdate` undoable branch. See candidate 7. |
| 47 | `packages/react/src/hooks.ts:122-131` | `packages/vue/src/data/mutations.ts:75-84` | 10 | `controller` | `useUpdate` undoable branch, tail. See candidate 7. |
| 48 | `packages/react/src/hooks.ts:146-156` | `packages/vue/src/data/mutations.ts:106-116` | 11 | `controller` | `useDelete` undoable branch. See candidate 7. |
| 49 | `packages/react/src/hooks.ts:201-208` | `packages/vue/src/data/create-chelone-hooks.ts:65-72` | 8 | `keep` | Typed forwarding wrappers in the hooks factory. |
| 50 | `packages/react/src/infinite-hooks.ts:18-34` | `packages/vue/src/controllers/use-infinite-list-controller.ts:35-51` | 17 | `move to core` | Result type; same generic as row 200. |
| 51 | `packages/react/src/infinite-hooks.ts:57-68` | `packages/vue/src/controllers/use-infinite-list-controller.ts:85-96` | 12 | `keep` | Bridge differs: render-phase `useState` in React, effect scope in Vue. |
| 52 | `packages/react/src/label/inflection.ts:34-45` | `packages/vue/src/label/inflection.ts:15-26` | 12 | `move to core` | `humanize`; pure. |
| 53 | `packages/react/src/label/inflection.ts:44-70` | `packages/vue/src/label/inflection.ts:37-64` | 27 | `move to core` | `humanizeField` and `pluralize`; pure. |
| 54 | `packages/react/src/label/inflection.ts:70-80` | `packages/vue/src/label/inflection.ts:76-84` | 11 | `move to core` | `pluralize` rules; pure. |
| 55 | `packages/react/src/label/inflection.ts:83-92` | `packages/vue/src/label/inflection.ts:64-73` | 10 | `move to core` | Irregular table; pure. |
| 56 | `packages/react/src/undoable-hooks.ts:4-52` | `packages/vue/src/data/undoable.ts:23-61` | 49 | `controller` | `runUndoable` options and the notification wiring. See candidate 5. |
| 57 | `packages/react/src/undoable-hooks.ts:58-87` | `packages/vue/src/data/undoable.ts:65-94` | 30 | `controller` | `runUndoable` body. See candidate 5. |
| 58 | `packages/react/src/util/shallow-equal.ts:16-27` | `packages/vue/src/lib/shallow-equal.ts:17-27` | 12 | `move to core` | `shallowEqual`; pure. |
| 59 | `packages/react/src/util/shallow-equal.ts:31-43` | `packages/vue/src/lib/shallow-equal.ts:29-40` | 13 | `move to core` | `shallowEqual` tail. |

## Ranked controller candidates

Ranked by cloned lines in the ledger rows the candidate covers, largest first. "Lines" is the whole file, or the line range when only part of a file moves. The last three rows are the files the issue asked to have measured that jscpd did not flag.

| Rank | Candidate | React | Vue | Core module it becomes | React lines | Vue lines | Cloned lines |
|---|---|---|---|---|---|---|---|
| 1 | `use-terra-draw` | `packages/react/src/components/maps-draw/use-terra-draw.ts:1-386` | `packages/vue/src/components/maps-draw/use-terra-draw.ts:1-413` | `packages/core/src/geo/terra-draw-editor.ts`, exported from the `@chelone/core/maps-draw` subpath | 386 | 413 | 188 |
| 2 | access-denied handling (`useLogoutIfAccessDenied`, `useWatchDataErrors`) | `packages/react/src/auth-hooks.ts:139-272` | `packages/vue/src/auth/permissions-hooks.ts:93-223` | `packages/core/src/auth/access-denied.ts` | 134 | 131 | 127 |
| 3 | `use-password-recovery` (token stripping) | `packages/react/src/components/admin/supabase/use-password-recovery.ts:83-163` | `packages/vue/src/components/admin/supabase/use-password-recovery.ts:92-176` | `packages/supabase/src/url-params.ts` (not core) | 81 of 163 | 85 of 176 | 113 |
| 4 | `use-json-schema` | `packages/react/src/components/monaco/internal/use-json-schema.ts:1-120` | `packages/vue/src/components/monaco/internal/use-json-schema.ts:1-132` | `packages/core/src/json/monaco-json-schema.ts` | 120 | 132 | 106 |
| 5 | `useUndoable` runner | `packages/react/src/undoable-hooks.ts:1-90` | `packages/vue/src/data/undoable.ts:1-95` | `packages/core/src/data/undoable-runner.ts` | 90 | 95 | 79 |
| 6 | `useArrayInput` binding holder | `packages/react/src/array-hooks.ts:69-199` | `packages/vue/src/array/use-array-input.ts:67-148` | `packages/core/src/form/array-input-controller.ts` | 131 of 328 | 82 of 154 | 63 |
| 7 | undoable branches of `useUpdate` and `useDelete` | `packages/react/src/hooks.ts:96-156` | `packages/vue/src/data/mutations.ts:43-116` | `packages/core/src/data/undoable-mutations.ts` | 61 of 214 | 74 of 224 | 48 |
| 8 | `duration-utils` | `packages/react/src/components/admin/inputs/duration-utils.ts:1-71` | `packages/vue/src/components/admin/inputs/duration-utils.ts:1-57` | `packages/core/src/form/duration.ts` | 71 | 57 | 33 |
| 9 | `cron-utils` | `packages/react/src/components/admin/inputs/cron-utils.ts:1-33` | `packages/vue/src/components/admin/inputs/cron-utils.ts:1-36` | `packages/core/src/form/cron.ts` (`looksLikeCron` only) | 33 | 36 | 7 |
| 10 | `use-osm-features` | `packages/react/src/components/maps-osm/use-osm-features.ts:1-64` | `packages/vue/src/components/maps-osm/use-osm-features.ts:1-68` | none; `overpassQueryOptions` is in core already | 64 | 68 | 0 |
| 11 | `use-geocode` | `packages/react/src/components/maps-osm/use-geocode.ts:1-77` | `packages/vue/src/components/maps-osm/use-geocode.ts:1-92` | none; `geocodeQueryOptions` is in core already | 77 | 92 | 0 |
| 12 | `use-reverse-geocode` | `packages/react/src/components/maps-osm/use-reverse-geocode.ts:1-44` | `packages/vue/src/components/maps-osm/use-reverse-geocode.ts:1-50` | none; `reverseGeocodeQueryOptions` is in core already | 44 | 50 | 0 |

What each one is and what stays behind:

1. `use-terra-draw`. In React, lines 1-211 are module-level code with no hook in it: the `DrawTool` type, `toolMode`, `selectFlags`, `buildModes`, `sameValue`, `userIds`. The hook proper is lines 213-386 (174 lines); in Vue it is lines 228-413 (186 lines). The core module holds the module-level code and a `createTerraDrawEditor` controller that owns the `TerraDraw` instance, the sync with `features`, `selectedId`, `refused`, `deleteSelected` and `destroy`. The hook keeps `useMap()` and the effect that attaches and releases the controller. It needs `terra-draw`, `terra-draw-maplibre-gl-adapter` and the map object, so it goes behind the subpath in the geometry section. `core/src/geo/editor.ts` already knows `terra-draw`'s property names, and `terra-draw` is already a core devDependency.
2. Access-denied handling. Both copies hold a module-level `logoutTimer` debounce and the same `handleRedirect`, `isAuthQueryKey` and query and mutation cache subscription code. `@tanstack/query-core` is already a core peer, so `watchDataErrors(queryClient, handler)` needs nothing new. The hooks keep reading the auth provider and router from their own context.
3. `use-password-recovery`. Lines 83-131 (React) and 92-140 (Vue) are `stripKeys` and `cleanedPath`: they remove `access_token`, `refresh_token` and `type` from the search, the hash query and the fragment so the refresh token does not stay in history. That is token handling, so one copy matters most here. Home is `@chelone/supabase`, not core: `url-params.ts` already holds `readSupabaseUrlParams`, and the package depends on core. `useResetPassword` and `useSetPassword` (about 25 lines each) stay, since each wraps its own query library. The filed issue needs the hostile-input test CLAUDE.md asks for: a token left in the URL after the hook runs.
4. `use-json-schema`. Both copies hold the same `shared` map of Monaco diagnostics options, `apply` and `getJsonDefaults`. The core module exposes `registerJsonSchema(monaco, options)` returning an unregister function; the hook and the composable are each a `useEffect` or `watchEffect` around it. `monaco-editor` is imported as a type only, so core needs it as an optional peer for types at most.
5. `useUndoable` runner. Core already has `startUndoableMutation`. What is left is the options type and the notification wiring (`undo`, `onClose`, the default error notification). The core runner takes the `QueryClient` and the notification store; the hook supplies them from context.
6. `useArrayInput`. `ArrayBinding` is in core. The clone is the `ArrayBindingHolder`, `toBindingUpdate` and the per-render update. The two return objects differ on purpose (React plain values, Vue getters) and stay. Smallest win of the controllers that need design work.
7. Undoable branches. `useUpdate` and `useDelete` each run the same optimistic-patch, deferred-commit and notification sequence. The core module holds one function per verb that builds the `runUndoable` options; each adapter calls it. Do after candidate 5.
8. `duration-utils`. Pure. React and Vue declare the same four exports. The cloned lines are 33 of 71 and 57; moving the file removes both copies. The size gap (71 and 57) is comments.
9. `cron-utils`. The files differ only in comments and `export` keywords, so moving them removes all 33 and 36 lines even though jscpd flags 7. `describeCron` wraps `cronstrue`, a direct dependency of both adapters. Move `looksLikeCron` and the regex, and leave the 6-line `describeCron` in the adapters, rather than give core a peer for it.
10. `use-osm-features`. jscpd flagged nothing. The query is built by `buildOverpassQuery` and `overpassQueryOptions` in core. What is left in each hook is provider lookup, the throw when there is none, the `enabled` merge and the memoised `select`, all tied to the framework's query library. The conversion it calls, `osm-features.ts`, is in the geometry section. Keep.
11. `use-geocode`. jscpd flagged nothing. Same shape as 10, plus a debounce written once per framework (`useState` and `useEffect` in React, `watch` and `onScopeDispose` in Vue). Keep. If a third adapter arrives, a core `debounce` helper is the part worth sharing.
12. `use-reverse-geocode`. jscpd flagged nothing. Same shape as 10. Keep.

The shared tail of 10 to 12 is the same eight lines in each file: take `provider` or the one from `MapsProvider`, throw if neither, merge `enabled`. A core `requireProvider(given, configured, hookName)` would save about 8 lines per file. It is too small to file alone.

## Pure moves that are not controllers

The 34 `move to core` rows group into these. Each is one issue covering both adapters, because the move deletes both copies.

| Group | Cloned lines | Core module |
|---|---|---|
| Choices context, accessors and `toChoicesContext` (`choices-hooks.ts` and `choices/*.ts`) | 178 | `packages/core/src/form/choices-context.ts`, next to `choices-controller.ts` |
| Geometry twins (see below) | 295 | `@chelone/core/maps-draw` and `@chelone/core/maps-osm` |
| `strip-json-comments` | 55 | `packages/core/src/json/strip-json-comments.ts` |
| Terra Draw tool types and `sameValue` | 58 | with candidate 1 |
| Vue copy of the CSV exporter | 75 | none; delete `packages/vue/src/components/admin/buttons/export.ts` and import from `@chelone/core`, as React does |
| `label/inflection` | 60 | `packages/core/src/i18n/inflection.ts` |
| `extractEventValue` | 50 | `packages/core/src/form/input-event.ts` |
| `firstFieldError` and message equality | 29 | `packages/core/src/form/field-error.ts` |
| Controller result type | 29 | `packages/core/src/controller/types.ts`, one generic |
| `shallowEqual` | 25 | `packages/core/src/store/shallow-equal.ts` |
| `isAuthQueryKey` | 19 | with candidate 2 |
| Array and command-menu result types | 24 | next to `ArrayBinding` and the command-menu registry |
| `duration-utils` and `cron-utils` | 40 | candidates 8 and 9 |

The Vue CSV exporter is a verbatim copy of `packages/core/src/csv/export.ts` with two import lines changed. It is the cheapest row in the ledger.

`label/inflection` shows the drift the note exists to prevent: React's file is 101 lines and Vue's is 91, with the same three exports, and `pluralize(word, count)` has no default count in React while Vue's is `count = 2`. Check that the rule tables give the same output before choosing one, and pin the case that differs in the core test.

## The geometry twins

`maps-draw/geometry-ops.ts` (120 lines), `maps-osm/osm-geometry-ops.ts` (70) and `maps-osm/osm-features.ts` (118) exist in both adapters under `packages/react/src/components/` and `packages/vue/src/components/`. The first two are byte-identical. `osm-features.ts` differs by one line: the `QueryClient` type comes from `@tanstack/react-query` or `@tanstack/vue-query`. Together they are 308 lines per adapter, with 927 lines of tests duplicated alongside (`geometry-ops.test.ts`, `osm-geometry-ops.test.ts`, `osm-features.test.ts`, in both).

They import `@turf/buffer`, `@turf/difference`, `@turf/simplify`, `@turf/union` and `osm2geojson-lite`. `@chelone/core` depends on none of them. Today both adapters list them as optional peers (`packages/react/package.json` and `packages/vue/package.json`), and the registry generator turns an optional peer that a copied file imports into a dependency of that registry item (`isOptionalPeer` in `scripts/registry/granularize-block.mjs`).

Core has so far avoided `@turf`: `packages/core/src/geo/geometry-math.ts` computes area by hand to agree with `@turf/area`. Core has one entry (`src/index.ts` in `packages/core/vite.config.ts`), `exports` lists only `.` and `./package.json`, and its peers are all required.

### Option A: core subpath entries with optional peers

Two entries, matching the adapters' add-ons so that an app that only draws does not need `osm2geojson-lite`:

- `@chelone/core/maps-draw`: `geometry-ops` (needs `@turf/difference`, `@turf/simplify`), and the Terra Draw editor from candidate 1.
- `@chelone/core/maps-osm`: `osm-geometry-ops` and `osm-features` (need `@turf/buffer`, `@turf/difference`, `@turf/union`, `osm2geojson-lite`). `QueryClient` becomes the `@tanstack/query-core` type, a peer core has.

What it takes:

- `packages/core/package.json`: two `exports` entries and their `publishConfig.exports`, five optional `peerDependencies` with `peerDependenciesMeta`, and `terra-draw` and its MapLibre adapter as optional peers for candidate 1.
- `packages/core/vite.config.ts`: `lib.entry` becomes a list, as `packages/react/vite.config.ts` already does. `check:pack` (publint and attw) must pass for the new entries.
- Registry: the adapter file would import `@chelone/core/maps-draw` and no longer `@turf/*`, so the generator would stop listing them as dependencies of the item. The generator needs a rule that reads core's optional peers for a subpath import, or the item needs them listed by hand. Without this, `shadcn add` installs a map input that fails at import.

What it gives:

- 308 lines and 927 test lines exist once. A geometry fix is one change.
- A third adapter gets the geometry for free.
- The framework-free rule holds: `@turf` is not a UI framework, and `noRestrictedImports` in `biome.json` names frameworks only.
- Registry copies are one-time snapshots in the user's app. Code in core reaches users through `npm update`, so a geometry fix reaches them without a re-copy.
- An app that never imports the subpaths resolves nothing new: `sideEffects` is `false` and the root entry is untouched.

### Option B: keep them in the adapters

What it gives:

- No build, `exports` or registry change. Each adapter stays self-contained, and the registry derives the dependencies as it does today.

What it costs:

- The two copies are already byte-identical, so they were copied, not written twice. Every future fix is two changes and a risk of a missed one, and a Solid or Svelte adapter makes it three.
- 927 lines of tests are repeated for the same reason.

### Recommendation

Option A. The only real cost is the registry rule, and that is a one-time change in a script that already handles optional peers. Option B saves a build change by paying the duplication on every later edit, and the files are already as identical as copies can be.

Order: ship `geometry-ops` first as the pilot. It touches one subpath, two peers and the registry rule, so it proves the plumbing. Then `osm-geometry-ops` and `osm-features`, then candidate 1 on the same `maps-draw` subpath.

## Filing the moves

Suggested order, cheapest and safest first. Each is one issue and one pull request that moves the code and updates React and Vue together, with an `Adapter reach: React and Vue in this issue` line.

1. Delete the Vue CSV exporter copy.
2. Pure moves from the table above, in groups of three or four.
3. Candidates 8 and 9, then 2, 5 and 7.
4. Candidate 3 in `@chelone/supabase`.
5. Geometry subpaths (pilot first), then candidates 1 and 4.
6. Candidate 6.
7. Candidates 10 to 12: no issue.

Two things this note does not settle:

- Whether core gains a `monaco-editor` type dependency for candidate 4. A type-only import in core with an optional peer is the smallest option.
- Whether to run jscpd in CI. A threshold would need a baseline of 57 React-and-Vue clones to start from.
