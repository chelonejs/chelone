# @chelone/vue

## [0.3.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.2.0...@chelone/vue@0.3.0) (2026-11-04)


### Features

* **react,vue:** type DataTable column and SortButton sources as SourceProp ([bc95cb9](https://github.com/chelonejs/chelone/commit/bc95cb9bc49f1d398b155d1f3a91767fefdd0338))
* **react,vue:** type DataTable column and SortButton sources as SourceProp ([7b7f4ee](https://github.com/chelonejs/chelone/commit/7b7f4eefc364ab0501a5cdb70236c3bc95e5399c))
* **react,vue:** type FieldProps, InputProps and the Vue choice inputs' source with SourceProp ([b62a3fe](https://github.com/chelonejs/chelone/commit/b62a3fe091fe00442c4d3fdb111633cea870469c))
* **react,vue:** type the workflow buttons' source props as top-level record keys ([41ef0cd](https://github.com/chelonejs/chelone/commit/41ef0cd6a16f20960959ddb63863164a31a36601))


### Bug Fixes

* **react,vue:** FilterForm and TreeList read a bracket or dot-index source through getAtPath ([62d38bd](https://github.com/chelonejs/chelone/commit/62d38bdad5f8d88815360f9ccad99f6ce30696cd))
* **react,vue:** ImageField and FileField read an array item's title and src by a bracket path ([dfc0063](https://github.com/chelonejs/chelone/commit/dfc0063d17601d83b4761b49e8409f31b975bc24))
* **react,vue:** keep a typed props spread compiling into useInput and useArrayInput ([502dcb9](https://github.com/chelonejs/chelone/commit/502dcb91fd523fe13ae4e15851ae89d0ea41dcdd))
* **react,vue:** read an ImageField and FileField array item's title and src by a bracket path ([0689621](https://github.com/chelonejs/chelone/commit/06896215b3e8cd405c9575c9e65f41fa6522a63a))
* **react,vue:** read choice and foreign-key paths through core's getAtPath ([1cc5d26](https://github.com/chelonejs/chelone/commit/1cc5d265bc08c83651fb4e434c0d2bc1e305c407))
* **react,vue:** read FilterForm and TreeList sources through getAtPath ([7376b85](https://github.com/chelonejs/chelone/commit/7376b85d2c06337b2c557ed304f8aa2b2c0647db))


### Refactors

* **react,vue:** read record paths through core's getAtPath ([26c3e3d](https://github.com/chelonejs/chelone/commit/26c3e3d626e7dde61b72cf85a85f84ec91d474da))
* **react,vue:** read record paths through core's getAtPath ([309f1ec](https://github.com/chelonejs/chelone/commit/309f1ec1691701fbc68c2ae002c3f707fe2ae8d2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.3.0
  * devDependencies
    * @chelone/supabase bumped to 0.3.0
  * peerDependencies
    * @chelone/supabase bumped to 0.3.0

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
