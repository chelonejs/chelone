# @chelone/vue

## [0.2.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.1.1...@chelone/vue@0.2.0) (2026-11-03)


### Bug Fixes

* **core:** a dot-index source binds the bracket field name ([7604cf3](https://github.com/chelonejs/chelone/commit/7604cf37dfa301ee9dadee51c1a694d2b7f4bb24))
* **core:** a dot-index source binds the bracket field name ([2ed8bca](https://github.com/chelonejs/chelone/commit/2ed8bca1911fa653ea4fa89c705891499bc2eb57))
* **core:** an Admin with no i18n reads in English instead of raw ra.* keys ([e5a9a1b](https://github.com/chelonejs/chelone/commit/e5a9a1bad78833a8b6d993511301ed5b5a6ff764))
* **core:** an Admin with no i18n reads in English instead of raw ra.* keys ([5476725](https://github.com/chelonejs/chelone/commit/54767256e35bb7c3b6d56eecff01e9411a1617f4))
* **vue:** English delete dialog title and calendar nav labels under the default i18n ([9ad060e](https://github.com/chelonejs/chelone/commit/9ad060e35ec53b0d05e92a2d127c7e41ceb9923e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.2.0
  * devDependencies
    * @chelone/supabase bumped to 0.2.0
  * peerDependencies
    * @chelone/supabase bumped to 0.2.0

## 0.1.1

### Patch Changes

- An undoable mutate runs the `onSuccess`, `onError` and `onSettled` it is given, with the setup shared in core
- A throwing `onSettled` no longer fails an undoable that already committed
- The calendar list restores its own `perPage` after a reload
- `mutate` and `mutateAsync` on an undoable are typed without a cast
- Updated dependencies [86ac54c]
  - @chelone/core@0.1.1
  - @chelone/supabase@0.1.1

## 0.1.0

### Minor Changes

- 7d585f2: First release.

### Patch Changes

- Updated dependencies [7d585f2]
  - @chelone/core@0.1.0
  - @chelone/supabase@0.1.0
