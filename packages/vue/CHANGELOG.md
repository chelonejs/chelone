# @chelone/vue

## [0.6.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.5.0...@chelone/vue@0.6.0) (2026-11-04)


### ⚠ BREAKING CHANGES

* **vue:** import KanbanBoard and KanbanBoardProps from @chelone/vue/kanban instead of @chelone/vue. @dnd-kit/vue and @dnd-kit/dom (needs Vue 3.5) are optional peers to install with it.

### Features

* **core:** toTimelineEntries reads timeline entries from records, formatRelativeTime moves to core ([b381402](https://github.com/chelonejs/chelone/commit/b3814020784ecd2ddb543da95110dc581e5b14c5))
* **react,vue:** useGetList takes a refetchInterval ([9ae8cda](https://github.com/chelonejs/chelone/commit/9ae8cdaa4ae4d5685f189cb7ebf3d691396762a0))
* **vue:** add dependency-free ChartContainer, ChartStyle, tooltip and legend content ([de690eb](https://github.com/chelonejs/chelone/commit/de690ebb5daf51e9adce5b4e4a1b989ec37e33b8))
* **vue:** KanbanBoard drags with @dnd-kit/vue, so touch works, and moves to @chelone/vue/kanban ([c592ee3](https://github.com/chelonejs/chelone/commit/c592ee35679be87ec96e91afbe1d6f8eec5c4f91))


### Bug Fixes

* **vue:** KanbanBoard keeps the attributes put on it ([a266958](https://github.com/chelonejs/chelone/commit/a266958a6f593fc6c68874a2d7a7e56139e365d0))
* **vue:** make chart ids hydrate, ignore inherited payload keys, handle missing values and labels ([0a9ac85](https://github.com/chelonejs/chelone/commit/0a9ac858c36b418ff7a6f3abd599fda896427094))
* **vue:** remove the type escapes from the chart family ([7c15067](https://github.com/chelonejs/chelone/commit/7c15067c326b1cdd61f43717b53fdafba42cd4a2))
* **vue:** the moved KanbanBoard keeps its type-escape baseline and adds none ([8598dd9](https://github.com/chelonejs/chelone/commit/8598dd991f48789f5a28bc7e738471d2fee63cfb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.6.0
  * devDependencies
    * @chelone/supabase bumped to 0.6.0
  * peerDependencies
    * @chelone/supabase bumped to 0.6.0

## [0.5.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.4.0...@chelone/vue@0.5.0) (2026-11-04)


### Features

* **vue:** a resource component's format, parse and transform take the value at its source ([8d74a0d](https://github.com/chelonejs/chelone/commit/8d74a0d521ff48af2b9c75ab10f155c81cced46d))


### Bug Fixes

* **react,vue:** type the Vue DatagridInput choice paths by its choices too ([6c34ecb](https://github.com/chelonejs/chelone/commit/6c34ecb4d89477686f9673259be35a5462390f1c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.5.0
  * devDependencies
    * @chelone/supabase bumped to 0.5.0
  * peerDependencies
    * @chelone/supabase bumped to 0.5.0

## [0.4.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.3.0...@chelone/vue@0.4.0) (2026-11-04)


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
* **vue,website:** KanbanBoard shows a list's records as columns, with a reference page ([28d8bc1](https://github.com/chelonejs/chelone/commit/28d8bc18dbf22529f9a6d358a3ca745e343d6dc3))
* **vue:** createResourceComponents binds a resource's views and retypes its fields and inputs ([9eec277](https://github.com/chelonejs/chelone/commit/9eec27739a1fce75932c0b4d0c895ebc87334cad))
* **vue:** export the resource component factories and type-check them in a fixture SFC ([8cdd3c8](https://github.com/chelonejs/chelone/commit/8cdd3c8ccc1c750f0901737d3e1ce87f96731981))
* **vue:** make useChoiceInput generic over the choice record ([d6335ba](https://github.com/chelonejs/chelone/commit/d6335ba263d441a519c69097d5788ef00538573a))
* **vue:** the first eleven display fields take a source typed by SourceProp ([910b5ed](https://github.com/chelonejs/chelone/commit/910b5edb173a0d6d1714b5c3548c634ed2959370))
* **vue:** the first eleven inputs take a source typed by SourceProp ([dfe8154](https://github.com/chelonejs/chelone/commit/dfe81540b02e346a03d8e0f0c6cfeaeb79e4e909))
* **vue:** the rating to subscription-plan inputs take a source typed by SourceProp ([dc9e55f](https://github.com/chelonejs/chelone/commit/dc9e55f97edade274800e04084add0aca3e146f8))
* **vue:** the rating to usage-meter display fields take a source typed by SourceProp ([687d3df](https://github.com/chelonejs/chelone/commit/687d3dfc625d6fdbb9793f9bfb0b648e3a5e7988))


### Bug Fixes

* **vue:** bind RecordType to the record prop of the three sibling-source fields ([5edfd61](https://github.com/chelonejs/chelone/commit/5edfd619096b55424aa0bbc3952cc41370ed0dd5))
* **vue:** filter generic SFCs out of ResourceComponents by type, not by a name list ([08b2fd8](https://github.com/chelonejs/chelone/commit/08b2fd82e0306e026e7d4c6fb7901da72240a3a9))
* **vue:** leave the four generic choice inputs out of the resource components ([a8258c0](https://github.com/chelonejs/chelone/commit/a8258c048a94c2230a390e167382a19635690bb6))
* **vue:** make the kanban Move menu work with the keyboard, and re-translate its empty column ([710c3f0](https://github.com/chelonejs/chelone/commit/710c3f01e65e7879ea38f66938b013d4f34ecc8f))


### Refactors

* **vue:** test an optional source without an empty-object type ([44ad094](https://github.com/chelonejs/chelone/commit/44ad0943874c0707f2791eec51c3ac9f4171e4cc))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.4.0
  * devDependencies
    * @chelone/supabase bumped to 0.4.0
  * peerDependencies
    * @chelone/supabase bumped to 0.4.0

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
