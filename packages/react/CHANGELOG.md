# @chelone/react

## [0.4.0](https://github.com/chelonejs/chelone/compare/@chelone/react@0.3.0...@chelone/react@0.4.0) (2026-11-04)


### Features

* **core,react,vue:** CalendarList and TreeList take their sources typed by the record ([ddda9a0](https://github.com/chelonejs/chelone/commit/ddda9a04ca7e59de59b985ae18efd011fcf6c4a6))
* **react,vue:** Labeled, the webhook-endpoint field and the add-on fields take SourceProp ([58e3818](https://github.com/chelonejs/chelone/commit/58e381829f7c0b7e8513d32c98b94f8907015a27))
* **react,vue:** rating, usage-meter and api-key sibling sources take SourceKey ([2b54e08](https://github.com/chelonejs/chelone/commit/2b54e085051ff9901b5ebb501c37a83610956b11))
* **react,vue:** the lat-lng and map search components type their sources ([319ed54](https://github.com/chelonejs/chelone/commit/319ed5415512b17eaaa2ad08f8a7d41d83734f44))
* **react,vue:** the map and draw inputs take a source typed by the record ([f59dd79](https://github.com/chelonejs/chelone/commit/f59dd79deb9b530d3f3775eb89de5996a9ad8469))
* **react,vue:** the reference fields take a source typed by the record ([6b3d706](https://github.com/chelonejs/chelone/commit/6b3d70658e17bf0a68ace66f6b76fcee1919c79a))
* **react,vue:** type ArrayInput, ReferenceInput, ReferenceArrayInput and SearchInput sources as SourceProp ([ac31e1c](https://github.com/chelonejs/chelone/commit/ac31e1c73272d507d1c84f2c34d4082be41115fc))
* **react,vue:** type optionText, optionValue and disableValue of the select and autocomplete inputs by their choices ([dc99857](https://github.com/chelonejs/chelone/commit/dc99857d2f34d04bf444003ae3827f20b303d9a6))
* **react,vue:** type source of ArrayField, RecordField, FunctionField and WrapperField ([b7bbae1](https://github.com/chelonejs/chelone/commit/b7bbae1cb9cfc2cc296230d57658b00aeb9c8ae3))
* **react,vue:** type the api-key, webhook-endpoint, datagrid, mdx and monaco sources by the record ([362d61d](https://github.com/chelonejs/chelone/commit/362d61da32700ffc939bafa6331bad5f2c64d067))
* **react,vue:** useFieldValue and useInput type a value by its source path ([b2b4553](https://github.com/chelonejs/chelone/commit/b2b45532d647857714df117c5e20b7a46b3f5611))
* **react:** createResourceComponents binds the views, fields and inputs to one resource ([a8651ec](https://github.com/chelonejs/chelone/commit/a8651ecd2bc6d708f218c3d9b5f51177fbe65374))
* **react:** GeoJsonField narrows source to the record it takes ([4b52ae5](https://github.com/chelonejs/chelone/commit/4b52ae5cf7b59b56ce03b408d135691a360d520b))
* **react:** KanbanBoard shows the records of a list as columns and moves a card by dragging it ([cdbd2c0](https://github.com/chelonejs/chelone/commit/cdbd2c0d6598a01dda5fad53c5d2c0b9d1ef44a9))


### Bug Fixes

* **react:** KanbanBoard ignores a drag without edit access and names Move to in plain text ([b8e3e35](https://github.com/chelonejs/chelone/commit/b8e3e3591c75fa92511b074e834e20616bbf6cbc))
* **vue:** bind RecordType to the record prop of the three sibling-source fields ([5edfd61](https://github.com/chelonejs/chelone/commit/5edfd619096b55424aa0bbc3952cc41370ed0dd5))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.4.0
  * devDependencies
    * @chelone/supabase bumped to 0.4.0
  * peerDependencies
    * @chelone/supabase bumped to 0.4.0

## [0.3.0](https://github.com/chelonejs/chelone/compare/@chelone/react@0.2.0...@chelone/react@0.3.0) (2026-11-04)


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

## [0.2.0](https://github.com/chelonejs/chelone/compare/@chelone/react@0.1.1...@chelone/react@0.2.0) (2026-11-03)


### Bug Fixes

* **core:** a dot-index source binds the bracket field name ([7604cf3](https://github.com/chelonejs/chelone/commit/7604cf37dfa301ee9dadee51c1a694d2b7f4bb24))
* **core:** a dot-index source binds the bracket field name ([2ed8bca](https://github.com/chelonejs/chelone/commit/2ed8bca1911fa653ea4fa89c705891499bc2eb57))
* **core:** an Admin with no i18n reads in English instead of raw ra.* keys ([e5a9a1b](https://github.com/chelonejs/chelone/commit/e5a9a1bad78833a8b6d993511301ed5b5a6ff764))
* **core:** an Admin with no i18n reads in English instead of raw ra.* keys ([5476725](https://github.com/chelonejs/chelone/commit/54767256e35bb7c3b6d56eecff01e9411a1617f4))
* **react:** create the data router after commit, not during render ([bfe9541](https://github.com/chelonejs/chelone/commit/bfe9541bc4e17b818eda3687ea3696817b3b6a3d))
* **react:** create the react-router data router after commit ([ef6c820](https://github.com/chelonejs/chelone/commit/ef6c820f905511f399305a09c9017f6f9a75a556))


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

- Every field's record is typed as core's `LooseRecord`, and `FieldProps` takes it, in place of the old `unknown` aliases
- `mutate` and `mutateAsync` on an undoable are typed without a cast
- `useGetRecordRepresentationText` is exported from the barrel
- Reference choices are labelled with text rather than a `recordRepresentation` element
- An undoable mutate runs the `onSuccess`, `onError` and `onSettled` it is given, with the setup shared in core
- A throwing `onSettled` no longer fails an undoable that already committed
- The calendar list restores its own `perPage` after a reload
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
