# @chelone/vue

## [0.13.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.12.0...@chelone/vue@0.13.0) (2026-11-10)


### Bug Fixes

* **react,vue:** choice and grid inputs pass their source on typed ([06f3c9b](https://github.com/chelonejs/chelone/commit/06f3c9bd28dfbdde6f4ab0ea77bcc50499867a9c))
* **react,vue:** default DualApprovalButton and StatusTransitionButton to a record that always has an id ([531776c](https://github.com/chelonejs/chelone/commit/531776cc6ca14927feae6d90aa3de1c0d7f7efba))
* **react,vue:** default the approval and status buttons to a record that always has an id ([a1d65a7](https://github.com/chelonejs/chelone/commit/a1d65a791411805ea9139b41d4e25e28dbc4e4aa))
* **react,vue:** pass choice and grid input sources on typed so they compile with every resource schema'd ([66f061c](https://github.com/chelonejs/chelone/commit/66f061cff7dafda9ab4807d7a44e67c176218d0f))
* **react,vue:** pass generic sources and sort payloads through the list and field components ([3f09d0f](https://github.com/chelonejs/chelone/commit/3f09d0fedb7a1c48429be84a55b93a3fd7ddf71d))
* **vue:** carry the record into the default editor of `InPlaceEditor` ([8d485a0](https://github.com/chelonejs/chelone/commit/8d485a05c7971b5a01bd9327773f52636c9e711d))
* **vue:** forms with their own fields type those sources against their own values ([e57235f](https://github.com/chelonejs/chelone/commit/e57235f6d8bffe7740f8e2c2479e7712ca068ec6))
* **vue:** keep the date inputs' parse out of RecordType inference ([b7f2e6f](https://github.com/chelonejs/chelone/commit/b7f2e6fcd8873882db8613ebd7d17564ef3d5ff7))
* **vue:** phone input puts its country select back on a rejected value ([5f0b21c](https://github.com/chelonejs/chelone/commit/5f0b21caa250c7f65580e5a6ca7f8859c86ca945))
* **vue:** read the list and column components at the caller's record ([9edafaa](https://github.com/chelonejs/chelone/commit/9edafaa08e6741d07d508703f507403ef3bf610b))


### Refactors

* **core,react,vue:** filter form helpers read and return a FilterPayload ([f082276](https://github.com/chelonejs/chelone/commit/f082276a40ce10ce7a344ca51f2ac9c8aaf5ce73))
* **core,vue:** read a record's id through a guard and type the form schema by its output ([c4a4712](https://github.com/chelonejs/chelone/commit/c4a4712d21e0ce96dbf91a82a96975288cc55aed))
* **react,vue:** label the form hooks' unknowns and type the scope's children ([68fbca5](https://github.com/chelonejs/chelone/commit/68fbca5f123b004aee9a4f39f6b475587e61729c))
* **vue:** read an input event's target through a guard ([3dddb1c](https://github.com/chelonejs/chelone/commit/3dddb1c7363951c9a754d9f6c7a01cbcd45ff197))
* **vue:** the Vue inputs name the value they store or label the boundary ([86ec558](https://github.com/chelonejs/chelone/commit/86ec558d53d3106fe74c3471526d8f2f7c644841))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.13.0
    * @chelone/utils bumped to 0.13.0
  * devDependencies
    * @chelone/supabase bumped to 0.13.0
  * peerDependencies
    * @chelone/supabase bumped to 0.13.0

## [0.12.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.11.0...@chelone/vue@0.12.0) (2026-11-09)


### Features

* **core,react,vue:** type reference and target against the resource registry ([8d2ae49](https://github.com/chelonejs/chelone/commit/8d2ae4934b1bd2e79b1356277b9d67ccb5fa3e22))
* **i18n:** type translate keys and params from a registered catalog ([102c60f](https://github.com/chelonejs/chelone/commit/102c60f9a345e00123be75c31b8bb9b08d5c693c))
* **vue:** a route-less Admin leaves the URLs to the app's routes ([0a656ac](https://github.com/chelonejs/chelone/commit/0a656ac857d3d036b3f72df325a3c727f9e25946))
* **vue:** data composables read the registered resources too ([b4f51af](https://github.com/chelonejs/chelone/commit/b4f51af7df3225feefaf881b6484f38027ba1bbc))


### Bug Fixes

* **admin:** a route-less Admin adds no Dashboard menu entry ([4f8bec8](https://github.com/chelonejs/chelone/commit/4f8bec8432defec831b75534f5308c72595e4db7))
* **core:** seed a list controller from the URL it mounts on ([22a8e56](https://github.com/chelonejs/chelone/commit/22a8e56ad1638bd95cf399fe8aba387b944d4185))
* **react,vue:** reference components read through the loose name arm ([28e52dd](https://github.com/chelonejs/chelone/commit/28e52dd6a86d9fe5a70ca0ca645d068bc81abc20))
* **vue:** bind ReferenceField's props to its generics, and pin every reference component ([d3d13ca](https://github.com/chelonejs/chelone/commit/d3d13ca7e44b7d19763ded696d8adec3c9283e7a))
* **vue:** type the reference components on a resource bundle ([e67f4c1](https://github.com/chelonejs/chelone/commit/e67f4c1cd83e65ad5acd7588a5cb4532dc0149c0))


### Refactors

* **core:** boolean, rating and email fields and the default record representation come from core ([d201918](https://github.com/chelonejs/chelone/commit/d20191815e760ddd4e1f15ec303a233457520548))
* **core:** format text, number, date and currency fields through core helpers ([783e747](https://github.com/chelonejs/chelone/commit/783e7479f3b0fa3d86e49ee5b37056b8c98ec4e2))
* **core:** url, file and image fields take their href and src from core ([c91a3bb](https://github.com/chelonejs/chelone/commit/c91a3bb1d7d7c80fa15d2056350cbaf766a31a24))
* **i18n:** drop the cast from asRegisteredTranslate ([caeebb8](https://github.com/chelonejs/chelone/commit/caeebb8c1fb20923106326c698bbbc8d440f48b5))
* **react,vue:** bulk buttons and drawer call the hooks; Vue builds on core options ([040a6d1](https://github.com/chelonejs/chelone/commit/040a6d11b29c8c6e4baa6624ab11cfb5ac18b691))
* **react,vue:** the data hooks name their resource with one core type ([8d13cb4](https://github.com/chelonejs/chelone/commit/8d13cb4d94313e899ec7bc750ac271211d6e68a1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.12.0
    * @chelone/utils bumped to 0.12.0
  * devDependencies
    * @chelone/supabase bumped to 0.12.0
  * peerDependencies
    * @chelone/supabase bumped to 0.12.0

## [0.11.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.10.0...@chelone/vue@0.11.0) (2026-11-08)


### ⚠ BREAKING CHANGES

* **i18n:** every `ra.*` i18n key is now `chelone.*`. Apps that override `ra.*` entries in their own catalogs must rename them.

### Features

* **core,react,vue:** key list and reference sort by the record ([1b482f3](https://github.com/chelonejs/chelone/commit/1b482f3b94c4f0e723169d397af4bdd5345ab8a4))
* **core,react,vue:** type choices sort and context by the record ([6f988f3](https://github.com/chelonejs/chelone/commit/6f988f387c6fcdfdda38887ae10443f85b292255))
* **core,react,vue:** type the calendar range helpers by the record ([cb995d6](https://github.com/chelonejs/chelone/commit/cb995d60baf8ba1b46bb10e11920db375a7008e4))
* **core:** a Resource name must be a registered resource once Register is augmented ([b0e4d08](https://github.com/chelonejs/chelone/commit/b0e4d08fc23cba5f311b67b674d4d8c3685e114c))
* **core:** key displayedFilters, showFilter and hideFilter by the record ([d873681](https://github.com/chelonejs/chelone/commit/d873681492691c262bec21be2dabe57c9c4c5498))
* **core:** make SortPayload generic over the record ([730bf78](https://github.com/chelonejs/chelone/commit/730bf7849537b4ff83f6a70d6b6477097997bb13))
* **csv:** a CSV import's fields and mapping are keys of the schema's record ([77a264a](https://github.com/chelonejs/chelone/commit/77a264a9fb9ea17dba8f2af3820d2bf3926a6297))
* **react,vue:** make useSavedQueries generic over the record ([de9a66d](https://github.com/chelonejs/chelone/commit/de9a66d6b5327d2ed9ade837df74cbfe78ff4912))
* **reference:** key a reference controller's target by the referenced record ([e40a394](https://github.com/chelonejs/chelone/commit/e40a394a3bdf761016646ee4075103bc1c1393b7))
* **vue:** set dir on the app root from the locale ([9f93c40](https://github.com/chelonejs/chelone/commit/9f93c40ba9c407dab6db9edcc42ac0a077a0ea70))


### Bug Fixes

* **core:** type a field descriptor's source as the registry-wide path ([36e722c](https://github.com/chelonejs/chelone/commit/36e722c6cb5b6ba3872f93b0d8e7ff817dc77694))
* **vue:** key the reference-many hook's filter actions by the record ([16950dc](https://github.com/chelonejs/chelone/commit/16950dce8b8c1fa7ff2a812f618e6469c47b556e))
* **vue:** pass the record type through the list and reference composables ([b66c63c](https://github.com/chelonejs/chelone/commit/b66c63c07673558479893a12b1bfe1cc63a3a7b2))


### Refactors

* **core:** keep the record type in diff rows ([2608e9f](https://github.com/chelonejs/chelone/commit/2608e9f41a5afadbfc22ff7b7322ef8b0af3e727))
* **core:** the cache ops take a resource map and a name ([e1af564](https://github.com/chelonejs/chelone/commit/e1af564dcec6dacf93e7cc94919a4df123b4a7f0))
* **i18n:** move the ra translation keys under chelone ([0aa5cd4](https://github.com/chelonejs/chelone/commit/0aa5cd412ba75afb0da1ffe471301b93d3f2678a))
* **reference:** let the reference hooks own the source default ([391c70a](https://github.com/chelonejs/chelone/commit/391c70a5e158115c3ee2582ffe48f6374820d083))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.11.0
    * @chelone/utils bumped to 0.11.0
  * devDependencies
    * @chelone/supabase bumped to 0.11.0
  * peerDependencies
    * @chelone/supabase bumped to 0.11.0

## [0.10.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.9.0...@chelone/vue@0.10.0) (2026-11-07)


### Features

* **devtools:** close the panel to a badged trigger button ([a45947f](https://github.com/chelonejs/chelone/commit/a45947fe3002ae4965427d8bb38564cbe6c6ca8d))
* **vue:** MenuLive renders as a sidebar menu button inside a sidebar ([934fd2f](https://github.com/chelonejs/chelone/commit/934fd2fca8192603735138307c28c30c219dcb36))


### Bug Fixes

* **devtools:** carry focus across the trigger swap ([f87196a](https://github.com/chelonejs/chelone/commit/f87196afd2c8ea71e0a3cfca410e3608b2409e69))
* MenuLive closes the mobile drawer and drops the title in it ([f7e7e23](https://github.com/chelonejs/chelone/commit/f7e7e2343e55da7e96cb680bc65c94903d342922))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.10.0
    * @chelone/utils bumped to 0.10.0
  * devDependencies
    * @chelone/supabase bumped to 0.10.0
  * peerDependencies
    * @chelone/supabase bumped to 0.10.0

## [0.9.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.8.0...@chelone/vue@0.9.0) (2026-11-07)


### Features

* **charts:** cycle the theme chart colors over BarChart bars ([dfb48da](https://github.com/chelonejs/chelone/commit/dfb48daf3ce496d3e3a57eefd7205a4d89159379))
* **command-menu:** one centred dialog on every screen size ([2c50c67](https://github.com/chelonejs/chelone/commit/2c50c674ef179f8d03a7b35e8a00c85e59fa403b))
* **vue:** add brandHref and a #brand slot to AppSidebar, drop the demos' sidebar copies ([ef97d37](https://github.com/chelonejs/chelone/commit/ef97d37e0591c4c18fd36f64c33808be389da175))


### Bug Fixes

* **charts:** paint every donut slice with its own fill ([44648d5](https://github.com/chelonejs/chelone/commit/44648d5d11999e2e78c2c687ed926ccdcd66bd3d))
* darken the light-mode sidebar accent so the selected item shows ([e3a4783](https://github.com/chelonejs/chelone/commit/e3a4783c70f12b0098816ac8c44455bb733c8af3))
* **list:** give ListPagination a default top margin in both adapters ([6c192ee](https://github.com/chelonejs/chelone/commit/6c192eeca3f3a7830534ed70b68c8942a4e5978f))
* **sidebar:** centre the icons and clear the app bar when collapsed ([458efc6](https://github.com/chelonejs/chelone/commit/458efc6ad0675777a917a6ce98a4133b6eaf9adb))
* **sidebar:** keep a one-line menu row at its 2rem height ([fc3e9a8](https://github.com/chelonejs/chelone/commit/fc3e9a881c791eccc515745ddcd295f03d70e8e0))
* **vue:** land ArrowUp on the last option when nothing is highlighted ([10cd7b4](https://github.com/chelonejs/chelone/commit/10cd7b4a007ca14a29d755afe9dda6310ab48430))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.9.0
    * @chelone/utils bumped to 0.9.0
  * devDependencies
    * @chelone/supabase bumped to 0.9.0
  * peerDependencies
    * @chelone/supabase bumped to 0.9.0

## [0.8.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.7.0...@chelone/vue@0.8.0) (2026-11-07)


### Features

* **demo:** a status page shows every loading, empty and error state ([cc3eb7f](https://github.com/chelonejs/chelone/commit/cc3eb7f942c76868ed2eada910adc689dc453c54))
* **demo:** a Team page uses the role matrix, access gate and translation editor ([fbd69c9](https://github.com/chelonejs/chelone/commit/fbd69c9778e68ae0b6054b10361a0c79fc86fae3))
* **demo:** both demos show every value input and the showcase entries are filled ([f23fc3b](https://github.com/chelonejs/chelone/commit/f23fc3b430252a1065c9b6b3aac203e5fb74962f))
* **demo:** posts go through review, approval and comments ([dae3e0e](https://github.com/chelonejs/chelone/commit/dae3e0e60d44941d0bbbb326119a02773c76fb14))
* **demo:** product variants use the array inputs ([1bd5a0c](https://github.com/chelonejs/chelone/commit/1bd5a0c026a44663284fd63e02269e6469f4348a))
* **demo:** the customer pages show plans, usage and contact details ([7cd38b0](https://github.com/chelonejs/chelone/commit/7cd38b0391dd2d28c27c96afcbe1d017fcd1ced4))
* **demo:** the product form uses the value inputs ([7eef8d8](https://github.com/chelonejs/chelone/commit/7eef8d8d05a580f06102819d9bd84249913285eb))
* **demo:** the Vue customer list uses the bulk actions and CSV import ([0555bd3](https://github.com/chelonejs/chelone/commit/0555bd30463a576e5f3ca0bc6e81add5a0a8cf40))
* **demo:** the Vue demo has products ([68e4753](https://github.com/chelonejs/chelone/commit/68e47532d8da11d4f2eb021c1b8360a6b6598a08))
* **demo:** use every filter and sort control in the product list ([b6d5195](https://github.com/chelonejs/chelone/commit/b6d51951c2d83d5867fc2dc82b6392aec63eff40))
* **docs:** give 11 components a Vue demo ([d320d72](https://github.com/chelonejs/chelone/commit/d320d72d420ab67945cb05fb15983a3c6a209cc9))
* **vue-demo:** customers and orders views matching the React demo ([4dba35d](https://github.com/chelonejs/chelone/commit/4dba35d16638f60022fb78992f91ae91a70bc928))
* **vue:** MenuItemLink takes a keyboardShortcut ([4987d9a](https://github.com/chelonejs/chelone/commit/4987d9a2643df67be1c73a458b3d410951c37dba))


### Bug Fixes

* a bulk update keeps its own label and the fake provider returns copies ([914f023](https://github.com/chelonejs/chelone/commit/914f0234bdf0e72920537575adc510043317d886))
* **calendar:** a selected day has the same range in both adapters ([6207063](https://github.com/chelonejs/chelone/commit/6207063f8cf3c39d903950dea0c43de1551ff287))
* centre the password toggle and open up the auth subtitle ([994426b](https://github.com/chelonejs/chelone/commit/994426b9560ced061de216bff57da005e7fa22ff))
* centre the password toggle, settle Monaco's auto-height, mark the React cron field ([f3502be](https://github.com/chelonejs/chelone/commit/f3502be5d6642da5664336110251d9dab14dd217))
* **core:** an image preview shows a stored raster data URL ([77967d1](https://github.com/chelonejs/chelone/commit/77967d19405ae7dc37d1654517c7ed29e4bc4b4d))
* **demo:** pages sit inside their menu group and the page scrolls under the app bar ([e3593f0](https://github.com/chelonejs/chelone/commit/e3593f0d514cc5dc6f0c95e56d0a1ce18319a4cd))
* **devtools:** scroll the entry list inside the panel ([2e2200f](https://github.com/chelonejs/chelone/commit/2e2200f74a02dab9b765a3484463716217e085ed))
* duration input values are not muted, and Vue date and time pickers match React ([9dbad84](https://github.com/chelonejs/chelone/commit/9dbad8453ea8e33b56cf4831d1f57048c521e98e))
* **i18n:** write fallback copy with core's placeholder ([a01e90a](https://github.com/chelonejs/chelone/commit/a01e90a374adb1457eec26b008029560dcb6a535))
* **list:** keep the data-table sort button inside its header cell ([63ba6bb](https://github.com/chelonejs/chelone/commit/63ba6bbaec30fbbe3cfe3bfdd4c4a0cf157b8b9e))
* **mdx-editor:** style dark theme and content to match the admin in both adapters ([854239b](https://github.com/chelonejs/chelone/commit/854239bb6044c785a99316573e100ecf88f80243))
* **react,vue:** centre the loading spinner, fit the error accordion, flex the update prompt ([8c47844](https://github.com/chelonejs/chelone/commit/8c4784408e96b9e794ff2f3e5c30784bf4f72398))
* **react,vue:** delete confirm, theme key and command menu defaults match across adapters ([a294fb1](https://github.com/chelonejs/chelone/commit/a294fb128d25567c7d07cbcff9b9fc823e72e2cd))
* **react,vue:** the clear button lines up with its input ([7c272b8](https://github.com/chelonejs/chelone/commit/7c272b89f4e182912bf68a7dd05218aa70c0ed18))
* readable webhook status in dark mode, pagination on the keys table ([7c10a31](https://github.com/chelonejs/chelone/commit/7c10a316f0b65f512481858ffb67761e8f6795e4))
* **views:** space the fields of Show, Create and Edit in both adapters ([ee19519](https://github.com/chelonejs/chelone/commit/ee19519fd02ddc03220ddf64a7a6b13ab10238a9))
* **vue:** a resource's views read their resource from context ([4e94d41](https://github.com/chelonejs/chelone/commit/4e94d412c71d5e428b184cfb8afc01f0749ff62c))
* **vue:** dark-mode chart grid, index dashboard in the demo shell ([c05cdff](https://github.com/chelonejs/chelone/commit/c05cdffad5e4237c341a826186253fe543ea7182))
* **vue:** NumberInput passes min, max and step to its number input ([9c08abb](https://github.com/chelonejs/chelone/commit/9c08abb6ed89ff54d1272a857f25aca3cbe17e18))


### Refactors

* **core,react,vue:** KanbanBoard and BlockDocField take an interface as their record ([d79b5e2](https://github.com/chelonejs/chelone/commit/d79b5e2035eca8468ef3878fdfb27fa4f17d237b))
* **core,react,vue:** map fit defaults have one definition ([5d33ce7](https://github.com/chelonejs/chelone/commit/5d33ce73c3eb5387d05e6a02e42cd17253946208))
* **core,react,vue:** map view defaults and coordinate limits have one definition ([5072a47](https://github.com/chelonejs/chelone/commit/5072a4780a2199475a28d56c2e199051be65f790))
* **core,react,vue:** the shared record types are bounded by ResourceRecord ([0fef358](https://github.com/chelonejs/chelone/commit/0fef358c3e67b58e353b5162b41b03e7ce575a9d))
* **core:** inspector, tour and layout constants have one definition ([d28b099](https://github.com/chelonejs/chelone/commit/d28b0994e0ecf510a70626e9e0045c88e929f506))
* **core:** shared UI defaults have one definition ([5d9a470](https://github.com/chelonejs/chelone/commit/5d9a47050bd5e6e3763194834e0adb46fc82a7c3))
* **core:** the login path has one definition ([d1d4d44](https://github.com/chelonejs/chelone/commit/d1d4d44081935a96ef588b00c6d13c021171f230))
* **core:** the Monaco constants have one definition ([cab3668](https://github.com/chelonejs/chelone/commit/cab36681dd1b5e43b118027ef76e5cb89a5b8508))
* **core:** theme and command menu defaults have one definition ([b798c29](https://github.com/chelonejs/chelone/commit/b798c2905aa9474dff484bc8e95b291ad8e87eea))
* **i18n:** put every literal translation key in the catalog ([4406dea](https://github.com/chelonejs/chelone/commit/4406dead064eed911168cebda308bf6368472579))
* **i18n:** wrap the Vue comments empty state like its neighbour ([8a2df5a](https://github.com/chelonejs/chelone/commit/8a2df5a788cf08c1658504ab89428dc0818cd525))
* **react,vue:** array, badge, boolean, chip, color and cron fields take an interface as their record ([0c2d4b7](https://github.com/chelonejs/chelone/commit/0c2d4b7a4fe7937d784c7d224448382cce31f5b5))
* **react,vue:** CalendarList is typed by its record ([b3df892](https://github.com/chelonejs/chelone/commit/b3df892e3a17a902c02a4e86fd9bda3ec0167ef5))
* **react,vue:** currency, date, duration, email and file fields and DiffViewer take an interface as their record ([cbe1141](https://github.com/chelonejs/chelone/commit/cbe11416751053f506212eb4e6ee8e8897823a09))
* **react,vue:** DataTable callbacks receive the table's record type ([b7ef13f](https://github.com/chelonejs/chelone/commit/b7ef13fde04bc4f876ec9f81d039d0952c174e19))
* **react,vue:** edit, show, clone and delete buttons take any record ([0612392](https://github.com/chelonejs/chelone/commit/0612392f8f35fdbc6ffaf027c9be6a7b01423b0a))
* **react,vue:** fields with a sibling source take an interface as their record ([f399b69](https://github.com/chelonejs/chelone/commit/f399b698beb0367f9b889de955b90a3b44ce82c6))
* **react,vue:** function, image, json, number, phone and record fields take an interface as their record ([f707bf0](https://github.com/chelonejs/chelone/commit/f707bf0d36cef6a46a14d6c28be7f3859a3b600b))
* **react,vue:** PivotGrid, RecordTimeline and ApprovalQueue take an interface as their record ([b0273b3](https://github.com/chelonejs/chelone/commit/b0273b3362d2b4b6f8621757055065da24cd6086))
* **react,vue:** read the list and reference defaults from core ([7b519d5](https://github.com/chelonejs/chelone/commit/7b519d5b3b21048281ee6dd5ffedf5b58ddf3983))
* **react,vue:** reference fields are generic over their record in both adapters ([259ee87](https://github.com/chelonejs/chelone/commit/259ee87e9322e27c1d234ca286fc969ec5e2803f))
* **react,vue:** reference inputs, InPlaceEditor and JobMonitor take an interface as their record ([864ea4b](https://github.com/chelonejs/chelone/commit/864ea4b9ad6eb664b02680ec2d7ee6a14703d359))
* **react,vue:** shape, simplify, geo-json and bbox fields use the core map defaults ([4229ac9](https://github.com/chelonejs/chelone/commit/4229ac9e14d4339acab4237791ff9edef75a0a43))
* **react,vue:** six fields take an interface as their record ([a4f7f0f](https://github.com/chelonejs/chelone/commit/a4f7f0f91f7fdd20e68743e001d4133a15bde3d7))
* **react,vue:** take the choice lists from core's choiceListsOf ([d9104c0](https://github.com/chelonejs/chelone/commit/d9104c064912b1f82537dc15bcf5b9cdf5cc75ef))
* **react,vue:** take the shared editor constants from core ([e4ad2b5](https://github.com/chelonejs/chelone/commit/e4ad2b5073d877d38e3ed939c44e3d770a61a62f))
* **react,vue:** the Monaco input builds its model path from MODEL_PREFIX ([7b7c8ba](https://github.com/chelonejs/chelone/commit/7b7c8bae55b23ffd09a3bb4e96ae32428570421e))
* **react,vue:** the Monaco, rich text and MDX fields take an interface ([ded9439](https://github.com/chelonejs/chelone/commit/ded94398b5857fbc168294cdb421dbe6e12f9a39))
* **react,vue:** the remaining record props take the caller's record ([09a4d47](https://github.com/chelonejs/chelone/commit/09a4d47b299a371cfa51dba835db347226bf23df))
* **react,vue:** TreeList callbacks receive the list's record type ([d5ced91](https://github.com/chelonejs/chelone/commit/d5ced91b02771360df3a14958b2ee8bef6acaafd))
* **react,vue:** update buttons and CanAccess take any record ([7b596a6](https://github.com/chelonejs/chelone/commit/7b596a6a7faa2f4cfcf91704be052335732041d0))
* useInput has one signature in both adapters ([df268de](https://github.com/chelonejs/chelone/commit/df268de2dce54b1e11177587ff7f68e1908b5cea))
* useInput has one signature in both adapters ([b7953e7](https://github.com/chelonejs/chelone/commit/b7953e7369f84ef6f4256d0826ba0d7822d7f4f3))
* **vue:** useRequiredResource returns the caller's resource name ([b392670](https://github.com/chelonejs/chelone/commit/b392670c5b25e5ab136baef9d68a4768055d2a3e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.8.0
    * @chelone/utils bumped to 0.8.0
  * devDependencies
    * @chelone/supabase bumped to 0.8.0
  * peerDependencies
    * @chelone/supabase bumped to 0.8.0

## [0.7.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.6.0...@chelone/vue@0.7.0) (2026-11-06)


### ⚠ BREAKING CHANGES

* **core:** removed Geo* type aliases, see the pull request body.
* **vue:** useListContext takes a record type, as React's does
* **core:** GeoJSON types come from @types/geojson, and a feature's properties are JSON
* **core:** location state is a typed LocationState, read through toLocationState

### Features

* **onboarding-tour:** expose start() through a ref in React and Vue ([cd51798](https://github.com/chelonejs/chelone/commit/cd51798673a32668110bac9b4f1c0252dec516f4))
* **react,vue:** MetricCard shows a headline number with its change ([a7ed6ee](https://github.com/chelonejs/chelone/commit/a7ed6eeba0573fbc8b956e3dcf661ac56fc12cff))
* **vue,website:** add ApprovalQueue to Vue and a reference page for both adapters ([faaea5b](https://github.com/chelonejs/chelone/commit/faaea5bf78378247c3ceef6addff7070d26f1cf1))
* **vue,website:** add DataProviderDevtools to the Vue adapter and a reference page ([8ad7a6c](https://github.com/chelonejs/chelone/commit/8ad7a6cff1794b4784de932b58cf922010707495))
* **vue,website:** add OnboardingTour to the Vue adapter and a reference page ([849bb1f](https://github.com/chelonejs/chelone/commit/849bb1fd18baf51223c823594399b7da8ddd7353))
* **vue,website:** add Vue Assistant chat panel and reference page ([d8bdfc9](https://github.com/chelonejs/chelone/commit/d8bdfc9e22366e2031b91c223038ba59004098ae))
* **vue,website:** DiffViewer shows two versions of a record side by side or inline ([0ea06d4](https://github.com/chelonejs/chelone/commit/0ea06d4b6ba3fc4519076ee781297208e42f6fa8))
* **vue,website:** I18nKeyEditor lists the missing keys of the current locale ([492dce7](https://github.com/chelonejs/chelone/commit/492dce7b0a087cf61e9c66962c8bf6a66c8d69ee))
* **vue,website:** JobMonitor in Vue, and a reference page for both adapters ([c7cd67d](https://github.com/chelonejs/chelone/commit/c7cd67d6871114f6d08a7c135cac2b6764c71dbd))
* **vue,website:** PivotGrid shows the records of a list as a pivot table, with a reference page ([9fdae53](https://github.com/chelonejs/chelone/commit/9fdae531cc398cf43d6b4c97b4e649294f84df9c))
* **vue,website:** RecordTimeline shows the records of a list as a dated activity list ([2b9266b](https://github.com/chelonejs/chelone/commit/2b9266b6dea13c328055152a1dd55654a21ac99a))
* **vue:** a chart data block for the block editor on the charts add-on ([46d1f9c](https://github.com/chelonejs/chelone/commit/46d1f9cf088bfef420728fe05f6f09f2f824c3e6))
* **vue:** a drag handle moves a block in the Vue block editor ([5c66fa7](https://github.com/chelonejs/chelone/commit/5c66fa73338e773612c4a62a3de7f78654975dd5))
* **vue:** add a /charts add-on with TrendChart on unovis as optional peers ([9d022f1](https://github.com/chelonejs/chelone/commit/9d022f177bb80678b7058e0870fa3dccb06fd613))
* **vue:** add InPlaceEditor that edits a shown value where it is ([240f1c1](https://github.com/chelonejs/chelone/commit/240f1c1eb9c72b571502468dd1bba1ea45949927))
* **vue:** add RichTextInput and RichTextField in the rich-text-input add-on ([e1e1aa3](https://github.com/chelonejs/chelone/commit/e1e1aa3f3700df073084188e4d5d84961b29844d))
* **vue:** add the block-editor add-on with BlockEditorInput and BlockDocField ([fe5f92a](https://github.com/chelonejs/chelone/commit/fe5f92abca1843d8576d3249d69fd74099d42b87))
* **vue:** add the inspector add-on with Inspector, InspectorButton, Configurable and SortableFieldsSelector ([b5fb517](https://github.com/chelonejs/chelone/commit/b5fb5173a93e22468d0b29c222adb4d07560c463))
* **vue:** BarChart and DonutChart in the /charts add-on ([3e27a3f](https://github.com/chelonejs/chelone/commit/3e27a3fd823f1c98c9e4643e71488e504754866e))
* **vue:** color RichTextInput text from a palette and highlight code blocks ([f98b915](https://github.com/chelonejs/chelone/commit/f98b9156ffd0f560d5cc2af3dd80995eadb03561))
* **vue:** ConfigurableInputs in the inspector add-on ([1ca31ee](https://github.com/chelonejs/chelone/commit/1ca31ee2d2db15c06f304cdccd0d83708d8e90d0))
* **vue:** default blocks and a block toolbar for the Vue block editor ([ea2f866](https://github.com/chelonejs/chelone/commit/ea2f866ee0c5a72e19f9f974116eb1938ad85769))
* **vue:** insert and upload rich text images ([8ae3f53](https://github.com/chelonejs/chelone/commit/8ae3f53c9cc222af86238a60f9176f557e349067))
* **vue:** PermissionMatrix shows a tab per role and toggles each resource and action grant ([d5fb638](https://github.com/chelonejs/chelone/commit/d5fb6382a00892d6da489d3bfbce1770ac7f4378))
* **vue:** reference record and record list data blocks for the block editor ([5c0b0a3](https://github.com/chelonejs/chelone/commit/5c0b0a3652ac2e7c95f29886af4869e0f2b4760c))
* **vue:** resize and view rich text images safely ([6ce161a](https://github.com/chelonejs/chelone/commit/6ce161a0cd4048ec6588d6ac9142dfe7ab4f5227))
* **vue:** Tabs, TabsList, TabsTrigger and TabsContent primitives in components/ui ([8de6fcc](https://github.com/chelonejs/chelone/commit/8de6fcc970f9229e3984e871583885a5c1147114))
* **vue:** take FieldsSelector out of ColumnsButton ([67bb25a](https://github.com/chelonejs/chelone/commit/67bb25ac94121fa9622ce6da7afb6c577bfd0cf5))


### Bug Fixes

* **core,react,vue:** a partially valid FK array keeps the ids it has ([2976a9d](https://github.com/chelonejs/chelone/commit/2976a9da1f500971c072aa1a33bd268258164fc7))
* **core,react,vue:** format is told about the holes a field can hold ([6ac440a](https://github.com/chelonejs/chelone/commit/6ac440af2c0582b8d39e699fa9f2f55f9b9f8da7))
* **core,react,vue:** keep the webhook seed for a null default and a stored amount without a currency ([bfefe1b](https://github.com/chelonejs/chelone/commit/bfefe1bca01ee65eaf8be3909b4b2a3ab4627bc8))
* **core:** keep a stored URL string as a file entry ([6110dd9](https://github.com/chelonejs/chelone/commit/6110dd9df1b229282beda49110aa7f55d71a8cc0))
* **react,vue:** &lt;CanAccess&gt; takes a record with its fields ([3d61916](https://github.com/chelonejs/chelone/commit/3d619161d8b00b8636498270fbf0316e7394f064))
* **react,vue:** gate FileField hrefs through isSafeFileUrl ([a0c8ff5](https://github.com/chelonejs/chelone/commit/a0c8ff525cc6045442eb67cea33812abefceba1e))
* **react,vue:** keep a literal SelectAllButton label out of the fallback ([8cd1c13](https://github.com/chelonejs/chelone/commit/8cd1c130c04a9f3d5edff3f23ab059d441d76a7e))
* **react,vue:** keep a missing FileField/ImageField src a miss ([e3ce201](https://github.com/chelonejs/chelone/commit/e3ce20195927aa1e5fee81fda68b3cb9145deec2))
* **react,vue:** keep ArrayInput a resource member when the record has no required id ([4f24eb1](https://github.com/chelonejs/chelone/commit/4f24eb1718732e70379692a73133458499213c5c))
* **react,vue:** keep the permissions change inside Biome's formatting ([7c281e7](https://github.com/chelonejs/chelone/commit/7c281e7749d1e9da7e3eeafc2c8d71a2c32b9d35))
* **react,vue:** keep the turf peers in the maps-draw registry items ([74167ab](https://github.com/chelonejs/chelone/commit/74167abe194a51c5a6dd1fc27ddcdb9b2b41f431))
* **react,vue:** keep the Vue resolver loose and match React to it ([53c7dfc](https://github.com/chelonejs/chelone/commit/53c7dfc99d249ef9e37bd05a1a995dcae858bd6e))
* **react,vue:** maps-osm registry items list the turf peers utils/osm imports ([7ecd8d5](https://github.com/chelonejs/chelone/commit/7ecd8d526379664c8cf9233143d30b2da2fda432))
* **registry:** an item importing a @chelone/utils subpath lists that subpath's optional peers ([938ee51](https://github.com/chelonejs/chelone/commit/938ee5155650a6f354f9efd8e61f2257d66c8f77))
* **vue:** a failed snap to roads warns the user ([38caa6c](https://github.com/chelonejs/chelone/commit/38caa6cfa344ab955350f3ec6c440f9abd587af4))
* **vue:** a reused job row follows a poll that changes its payload or creation time ([4225177](https://github.com/chelonejs/chelone/commit/422517720681935eb71b177daf3fd42e65dd9b78))
* **vue:** catch-all routes keep their splat param under vue-router 5 ([bdc3ba9](https://github.com/chelonejs/chelone/commit/bdc3ba91668d77e5f1a82552ffac3bf2875a58ff))
* **vue:** CurrencyField formats a composite value whose amount is a numeric string ([6b41d7b](https://github.com/chelonejs/chelone/commit/6b41d7b6693bd4df727bef6f90d130cfdfc76ce7))
* **vue:** DataProviderDevtools follows a new log prop ([0dc9222](https://github.com/chelonejs/chelone/commit/0dc92225aa827d95ff60ff963638984ae51e0c70))
* **vue:** declare zod as an optional peer ([6aeb1e6](https://github.com/chelonejs/chelone/commit/6aeb1e6657b541a997d0d6613cbefa4f92baab22))
* **vue:** DiffViewer sources accepts a readonly list ([0a3d081](https://github.com/chelonejs/chelone/commit/0a3d0812829af0f64bf6b9b18d4cd62a7d0c51a8))
* **vue:** follow reactive rich text image settings ([681f618](https://github.com/chelonejs/chelone/commit/681f6181ef3f6400b5c185790111ff83abe2f3ed))
* **vue:** forward class and disabled, teleport the editor, end a drag on a second press ([50d2820](https://github.com/chelonejs/chelone/commit/50d282072be05de0d2ead5c512daea0b6fc85310))
* **vue:** ignore a command's non-promise return value ([437b5ff](https://github.com/chelonejs/chelone/commit/437b5ffb5be1c711aac8dceea670a745786e4b06))
* **vue:** import isResourceRecord in the representation resolver ([a90059d](https://github.com/chelonejs/chelone/commit/a90059d0e677a7f9078342de74e6966e53431fb4))
* **vue:** import PermissionMatrixValue once in PermissionMatrix ([0ba46dd](https://github.com/chelonejs/chelone/commit/0ba46dd81aab3d4f597cd94cef2b56aac0559a86))
* **vue:** import the command barrel in block-picker so the registry lists @chelone/command ([81310e7](https://github.com/chelonejs/chelone/commit/81310e7a74106aa3e15410644367ea139fb82094))
* **vue:** keep a tab reachable by keyboard and add orientation to Tabs ([0bf8243](https://github.com/chelonejs/chelone/commit/0bf8243fe8ae933b05a68c20ef4e3dc78a9a08a3))
* **vue:** leave text nodes out of the ConfigurableInputs columns ([5ba3b38](https://github.com/chelonejs/chelone/commit/5ba3b38a1d763dead39e3128721b88f4c8622c34))
* **vue:** make RichTextField follow changes to its record prop ([cca717b](https://github.com/chelonejs/chelone/commit/cca717beec22ecb8076d594e7050f033d9d255d7))
* **vue:** PermissionMatrix checkboxes show the model again after a click that changes nothing ([48ce97c](https://github.com/chelonejs/chelone/commit/48ce97cbe3b6988249ef30a95d9cb72857e579d4))
* **vue:** read the mutation mode once in InPlaceEditor ([ed64271](https://github.com/chelonejs/chelone/commit/ed64271ee5718ae305defaefa11d154d6bf230cd))
* **vue:** run useFormHandle's narrowing under test and leave filter forms unbound ([0ed3b09](https://github.com/chelonejs/chelone/commit/0ed3b097cd20663d803abb337f8b9309d32b4229))
* **vue:** show Assistant confirm arguments verbatim in a pre ([bc29b65](https://github.com/chelonejs/chelone/commit/bc29b65415cb0c4ed7df8f7f5e0561aac76ab4f0))
* **vue:** the error view keeps an empty message empty, as before and as React does ([92421f4](https://github.com/chelonejs/chelone/commit/92421f4af89e9c35d4a88c79f99f0286bc7b9c0b))
* **vue:** type DatagridInput defaultValue by its source ([65c315e](https://github.com/chelonejs/chelone/commit/65c315e14d90363664797397c022020bcfe74d26))
* **vue:** write an uploaded image to the block it was chosen for ([0bbb059](https://github.com/chelonejs/chelone/commit/0bbb059679e351a3dc40995e5a31e0cad655edea))


### Refactors

* **core,react,vue:** a choices fetch error is an Error ([ab4d940](https://github.com/chelonejs/chelone/commit/ab4d940dbb8ca33b4256c84ba8dbbd4dd85f5795))
* **core,react,vue:** a record-level permission takes a record, not unknown ([3125ed0](https://github.com/chelonejs/chelone/commit/3125ed0fd4c63baa5b4bc9907938cfb1652942b2))
* **core,react,vue:** an Overpass answer is a typed OverpassAnswer ([fec58ca](https://github.com/chelonejs/chelone/commit/fec58ca4718bfb7d1b0ce1ecf3a3874d821b2579))
* **core,react,vue:** array inputs type rows by the resource's record ([635bfde](https://github.com/chelonejs/chelone/commit/635bfde6b2f9fd2b8418d6ce266e3700332d36a1))
* **core,react,vue:** auth queries skip with skipToken and pass no stub provider ([a2bdc57](https://github.com/chelonejs/chelone/commit/a2bdc57ef52633849a164ad4a6355e985eb2d285))
* **core,react,vue:** canAccessQueryOptions takes an optional provider ([7ae6dc9](https://github.com/chelonejs/chelone/commit/7ae6dc992acaedb4a445906c0adc8bb58606ff4e))
* **core,react,vue:** currency, rating, duration, plan and webhook inputs read a typed value ([51b9bb1](https://github.com/chelonejs/chelone/commit/51b9bb117178094c330a916ca5eef98bec5ba34f))
* **core,react,vue:** drop casts the compiler no longer needs ([c6a3695](https://github.com/chelonejs/chelone/commit/c6a36958088e21df028989c6f19ad3f3db2c3c29))
* **core,react,vue:** form code narrows objects with the shared core guards ([176269d](https://github.com/chelonejs/chelone/commit/176269d46311a1fcb3abb0685d4e0d464e427f57))
* **core,react,vue:** getRecordForLocale returns a typed localized record ([8a6295e](https://github.com/chelonejs/chelone/commit/8a6295e55fb49640887f459cfa48102c8c47be68))
* **core,react,vue:** group and step state read form-core's field meta types ([7e7e4a4](https://github.com/chelonejs/chelone/commit/7e7e4a4d7d915f5092d8210eed6c4add83e6ac7a))
* **core,react,vue:** humanize, humanizeField and pluralize live in core ([51a41ce](https://github.com/chelonejs/chelone/commit/51a41ce3a9c03472624f5dbdb30640214e6b64fd))
* **core,react,vue:** MapLibre takes the shape layers and GeoJSON data without a cast ([df346e0](https://github.com/chelonejs/chelone/commit/df346e03c23d554a7895007f3b7bc1082ba9ddbd))
* **core,react,vue:** move the ISO duration helpers to core ([d7ace73](https://github.com/chelonejs/chelone/commit/d7ace733d6d56cead841f259429ad5dad239eade))
* **core,react,vue:** narrow datagrid input ids with toIdentifierList ([3f1b0cd](https://github.com/chelonejs/chelone/commit/3f1b0cd0aaf4b92c51c66d88693aae5204e3ef68))
* **core,react,vue:** one noop in core replaces the empty functions the adapters declare ([14b54ff](https://github.com/chelonejs/chelone/commit/14b54ffe20f8e2e57996e1d5e5b1c469db50b8fe))
* **core,react,vue:** one textOf turns a nullish form value into "" and anything else into a string ([cf5971a](https://github.com/chelonejs/chelone/commit/cf5971af109830beef0097294c8b87983360f46c))
* **core,react,vue:** pass previousData from the approval and transition buttons with no cast ([805eb90](https://github.com/chelonejs/chelone/commit/805eb906f517c9debd807cf5523c5dc9dac2ae71))
* **core,react,vue:** prev/next reads the cached page's number pagination ([d0b8322](https://github.com/chelonejs/chelone/commit/d0b8322c2be7a7fea548643d20bea5bed3cef0a5))
* **core,react,vue:** read a login error message through errorMessageOf ([13994db](https://github.com/chelonejs/chelone/commit/13994db19e7c29c769c0b3e9723dfd2aa1ae9766))
* **core,react,vue:** recordsToCSV takes CsvRow rows so the CSV import needs no cast ([a81c449](https://github.com/chelonejs/chelone/commit/a81c4496f9e7355382e8f830408cb1992d6da178))
* **core,react,vue:** resource definitions carry the adapter's component types ([0f07df7](https://github.com/chelonejs/chelone/commit/0f07df715a7dd3d20ad89bada674454f1053144d))
* **core,react,vue:** shallowEqual lives in core and both adapters re-export it ([b2d415f](https://github.com/chelonejs/chelone/commit/b2d415fc3a7deeb22d8a975fb9dd5161ee52ed3b))
* **core,react,vue:** the date, date-time and time formatters live in core ([10085e0](https://github.com/chelonejs/chelone/commit/10085e00021fbc53cfa5358d05640f4b8025cbcd))
* **core,react,vue:** the draw editor takes and gives typed JSON features, with no cast ([7d3f31a](https://github.com/chelonejs/chelone/commit/7d3f31a7a8dc495a81e98e5b80673c46086bc35f))
* **core,react,vue:** turf takes and returns core's GeoJSON types without a cast ([3bb797f](https://github.com/chelonejs/chelone/commit/3bb797f38b88a80942d799e3f5e792936b998f9c))
* **core,react,vue:** workflow and kanban rules read typed record keys ([779b190](https://github.com/chelonejs/chelone/commit/779b190356843ac57b53878052dd19a81da8b402))
* **core,vue:** type optimistic cache writes by the resource's record ([b140a8a](https://github.com/chelonejs/chelone/commit/b140a8a0a78e5f1f1fa156002daec25933b369a2))
* **core:** controller states carry the query's Error and the record base type ([dd291bb](https://github.com/chelonejs/chelone/commit/dd291bba82cbbb0fb2025e1e32019d5785ffd2fe))
* **core:** core no longer exports the Geo* types ([5b59118](https://github.com/chelonejs/chelone/commit/5b591185e43f330176a15663da229ad42c62e4bd))
* **core:** firstFieldError moves to core, shared by both adapters ([1022536](https://github.com/chelonejs/chelone/commit/1022536feba4a59828e2299d87725770113359d5))
* **core:** GeoJSON types come from @types/geojson, and a feature's properties are JSON ([14c632a](https://github.com/chelonejs/chelone/commit/14c632a3cda2037777fb2281c69b0076e34b814f))
* **core:** location state is a typed LocationState, read through toLocationState ([8d8f98e](https://github.com/chelonejs/chelone/commit/8d8f98e72e267a2c10c9fd37710b1aac110ccd54))
* **core:** re-export the GeoJSON types its guards accept ([1689e1c](https://github.com/chelonejs/chelone/commit/1689e1cdbce0fd6d3954a70cf10bfa8b8204ac08))
* **react,vue:** a choice's disabled flag is a boolean ([be13f04](https://github.com/chelonejs/chelone/commit/be13f0413af827b099eb420dd7f3b7096f8aee25))
* **react,vue:** a formatter returns what it renders, not unknown ([95cd777](https://github.com/chelonejs/chelone/commit/95cd7772586da3612257babfedeabe992b172c0c))
* **react,vue:** adapters take TranslateParamValues for translate params ([d39edb2](https://github.com/chelonejs/chelone/commit/d39edb262c8d08c027733dca2e753114f8036cfd))
* **react,vue:** call core deepEqual from the drawing inputs ([414e6a6](https://github.com/chelonejs/chelone/commit/414e6a6d6b7f956031cd1c0b8fc6dc7af59bed37))
* **react,vue:** check event targets with instanceof instead of casting ([1da9528](https://github.com/chelonejs/chelone/commit/1da9528475a446e74289f887d1bf71bfda5fc819))
* **react,vue:** Create and Edit are generic in their record ([3916e23](https://github.com/chelonejs/chelone/commit/3916e23c2dd5b4b2bed38cb39625a19d5a81a22d))
* **react,vue:** detect tab and step children without casts ([4bbdef9](https://github.com/chelonejs/chelone/commit/4bbdef965a0f25906f598550c3782001aba8adaf))
* **react,vue:** find Monaco's legacy JSON defaults with a guard ([b1d0393](https://github.com/chelonejs/chelone/commit/b1d0393e3a496d605cc46744393e49d55807f08d))
* **react,vue:** guard the OSM operator's field and abort error ([46405b7](https://github.com/chelonejs/chelone/commit/46405b76c2880feb98ce29ed93e8e3230b043faa))
* **react,vue:** LatLngInput formats from the parsed coordinate ([68bfeb7](https://github.com/chelonejs/chelone/commit/68bfeb7d6399d3f39ec22c567c9660c9c04c06cb))
* **react,vue:** list components read the ambient list's records typed, not cast ([60b0e81](https://github.com/chelonejs/chelone/commit/60b0e8178104b273683775d0be195759b403a07e))
* **react,vue:** map fields type their record prop with the component's own record generic ([580bde5](https://github.com/chelonejs/chelone/commit/580bde5b5253ae23f41dfbc0317a3174a90139f5))
* **react,vue:** narrow event targets with instanceof, not a cast ([0bef0f8](https://github.com/chelonejs/chelone/commit/0bef0f89c5de418e69da0cf4f5f23a622264d742))
* **react,vue:** password recovery calls the supabase provider through a type guard ([0fe7d79](https://github.com/chelonejs/chelone/commit/0fe7d79df8ccbb56bbf9bf8080f7e1c38585021f))
* **react,vue:** permissions take the app's registered permissions type ([048ce2a](https://github.com/chelonejs/chelone/commit/048ce2af8cb9bc7d78868f9e4e3d5928d2df79f8))
* **react,vue:** read a first element with a fallback, not an assertion ([68fb3c4](https://github.com/chelonejs/chelone/commit/68fb3c434fab03f2af0ab896ebcc0356af9ab222))
* **react,vue:** read FileField and ImageField paths without casts ([0f45883](https://github.com/chelonejs/chelone/commit/0f45883d348c2df3d7d981a6b6e93115aa898d19))
* **react,vue:** read sibling-key values with a type check, not a cast ([90e9a9c](https://github.com/chelonejs/chelone/commit/90e9a9ca7b91405ff92fbb403f5a2eb6056ee88d))
* **react,vue:** read the list filter without a cast to Record&lt;string, unknown&gt; ([e3e69b8](https://github.com/chelonejs/chelone/commit/e3e69b84805eee287fb2f78b03a84894e2606d3e))
* **react,vue:** realtime hooks read reconnect and record ids without casts ([0bce3a2](https://github.com/chelonejs/chelone/commit/0bce3a2d7d74634f23478a049d3951a809f9de77))
* **react,vue:** redirect and link callbacks receive the record they act on ([7172436](https://github.com/chelonejs/chelone/commit/7172436d4389bf5b5b286bd14ced1e36e843b52e))
* **react,vue:** reference fields read their key and records without casts ([63b5a57](https://github.com/chelonejs/chelone/commit/63b5a576b362bfa894b5d8ec46b3221d3cef09c3))
* **react,vue:** router state is Chelone's typed LocationState ([dcdd742](https://github.com/chelonejs/chelone/commit/dcdd742285cd11db157629679768c9779ea41803))
* **react,vue:** text-valued inputs read a typed value ([8f1000d](https://github.com/chelonejs/chelone/commit/8f1000d7486ebfd60697560a78fa6beb9a45654e))
* **react,vue:** the drawing inputs type what they wrote ([d74796b](https://github.com/chelonejs/chelone/commit/d74796b2263cf7e09dc2ad8a7dae018ad973b553))
* **react,vue:** the realtime components take real types for ids, comments and providers ([f29674e](https://github.com/chelonejs/chelone/commit/f29674e3ebc5d602be3c68cabda9eebfc6af4bf9))
* **react,vue:** the supabase forms and the error view read a message through errorMessageOf ([2466e90](https://github.com/chelonejs/chelone/commit/2466e90b1fd0eaeac3ef692b9660e3537b4b9f2d))
* **react,vue:** type auth query errors as Error | null ([54a70f2](https://github.com/chelonejs/chelone/commit/54a70f2c7f849c4ea765473745987e4e74275714))
* **react,vue:** type record representation hooks with ResourceRecord ([abe1d78](https://github.com/chelonejs/chelone/commit/abe1d78f7e65ae72118065504486611bb0d0185c))
* **react,vue:** ui lookups by string key use a typed map or a guard ([cacbc0c](https://github.com/chelonejs/chelone/commit/cacbc0c164c359e4e629f6ef359c72e4d5489698))
* **react,vue:** UpdateButton reads its record and result without casts ([9d7dbd3](https://github.com/chelonejs/chelone/commit/9d7dbd333aaa2e4be3ca95a919af60048d68614b))
* **react,vue:** useArrayInput types add, insert and replace by the row ([ff5cdff](https://github.com/chelonejs/chelone/commit/ff5cdff2c0b9e14fb52a145cdf46e816258e91b4))
* **react,vue:** view, save and record contexts default to ResourceRecord ([35e7940](https://github.com/chelonejs/chelone/commit/35e7940a7a61b5593f097f5b4d1d8fd50ee2b1c4))
* **react:** choice inputs type the field and the choice values ([8196073](https://github.com/chelonejs/chelone/commit/81960736d650721a0684193aa3e88741566bd490))
* **utils,react,vue:** cutFeatures and simplifyGeo live in @chelone/utils/geo ([de3fa37](https://github.com/chelonejs/chelone/commit/de3fa37418e74371b6df7c3704935e466a5428fb))
* **utils,react,vue:** the cron helpers live in @chelone/utils/cron ([7726036](https://github.com/chelonejs/chelone/commit/77260364b3adc2795a2eb74fe90125a8cd7d7e12))
* **utils,react,vue:** the Overpass to polygon helpers live in @chelone/utils/osm ([b506d5d](https://github.com/chelonejs/chelone/commit/b506d5d61e1a53845f9bf6915a640616208d6089))
* **utils,react,vue:** unionAll and subtractMask live in @chelone/utils/osm ([722b6d5](https://github.com/chelonejs/chelone/commit/722b6d5bd55f363cf713409f952773d258d8b726))
* **vue:** bind a view in createResourceComponents with no cast ([6e42c06](https://github.com/chelonejs/chelone/commit/6e42c06567cf3a40f1e2f979c8e6a9a94c5e264d))
* **vue:** buttons narrow the resource once and drop the string casts ([3871e7c](https://github.com/chelonejs/chelone/commit/3871e7c36acc47fb4e08da441aaf92438090278d))
* **vue:** call the update mutation with the kanban move plan, no cast ([3edf74b](https://github.com/chelonejs/chelone/commit/3edf74b27c3c20d39abc9adcdfaafdc2e049b730))
* **vue:** choice inputs type the field and the choice values ([9698d72](https://github.com/chelonejs/chelone/commit/9698d72c8cdf92772a7e9dd8aba59e4e9fb9d418))
* **vue:** DataTable reads a row's id without casts ([5f13338](https://github.com/chelonejs/chelone/commit/5f13338431c6ace97dbdcbcb6e4980b7e988f591))
* **vue:** date and time inputs read and parse typed values ([78b8ca6](https://github.com/chelonejs/chelone/commit/78b8ca646b4f2c03fcf5603ed027e543afe207fa))
* **vue:** declare Labeled's label and source props with a plain PropType ([9a36dda](https://github.com/chelonejs/chelone/commit/9a36ddaabe871d0ea5438509e2286c08fccbd00e))
* **vue:** delegate each reference-many action by name with its own types ([94d7f3d](https://github.com/chelonejs/chelone/commit/94d7f3da43c9c9ad38d2e628bfaa06b1003f4ac4))
* **vue:** drop the casts that restate a type in the buttons, guessers, layout and lock status ([a926fd7](https://github.com/chelonejs/chelone/commit/a926fd7f3d38ebaf8f606f52d3f1a991d5317356))
* **vue:** drop the casts that restate a type in the views and the ui field ([948e44b](https://github.com/chelonejs/chelone/commit/948e44b225fac3f5c337b0b05b31d68d22eb69b3))
* **vue:** drop the Record base from login and password form values ([d833d62](https://github.com/chelonejs/chelone/commit/d833d62aa4735bcc50b706eaecee2aada3a1b97d))
* **vue:** forward the wrapper inputs' props by key list, with no cast ([551deb9](https://github.com/chelonejs/chelone/commit/551deb936afaabc8d90bd0d406d178f50956f1c1))
* **vue:** FunctionField and RecordField read the record without a cast ([283d306](https://github.com/chelonejs/chelone/commit/283d306c60eb1a9b041db2678cad266c0af3fdc0))
* **vue:** geometry-ops mirrors the react file ([709e345](https://github.com/chelonejs/chelone/commit/709e3451bd0c0a4d2d623b4e37ebf29557c17a43))
* **vue:** GetRecordRepresentation takes a record, as React's does ([792a992](https://github.com/chelonejs/chelone/commit/792a992bd862164521f5159c7bd84c857dbb9354))
* **vue:** import GeoJSON types from geojson in maps and maps-osm ([d54b4be](https://github.com/chelonejs/chelone/commit/d54b4be9e588c4cd6b1de82f5203dd63f86dbcdf))
* **vue:** import VNode inline to avoid a calendar view clone ([8653623](https://github.com/chelonejs/chelone/commit/865362390de9da9d6cf892618b753a64d4e4467c))
* **vue:** keep the useList error option at Error or null ([66fd6d9](https://github.com/chelonejs/chelone/commit/66fd6d9b46671c21a82fe2172894ee486968fcfe))
* **vue:** list and field slots return VNode[], not unknown ([d41609e](https://github.com/chelonejs/chelone/commit/d41609e0297b7a2af2e169fe3b7d0d0f8cf83fae))
* **vue:** make ArrayField and WebhookEndpointField generic in their record ([50fcbb4](https://github.com/chelonejs/chelone/commit/50fcbb43666ed60193b026725ffc2a1e43df24e0))
* **vue:** map components type their props through defineComponent's function form ([08bb18b](https://github.com/chelonejs/chelone/commit/08bb18b7951354274ce6ec83a45b01a40bf34047))
* **vue:** narrow controller scopes and empty notifications without casts ([be6b1c7](https://github.com/chelonejs/chelone/commit/be6b1c72ec010bc8aad4f189bd20fc3cc3b93a88))
* **vue:** number, nullable-boolean and file inputs read and parse typed values ([f7985de](https://github.com/chelonejs/chelone/commit/f7985dec95e95b8a25598b46bc2fca1edb3de100))
* **vue:** read nullable values in Count, ListPagination and KanbanBoard without casts ([8f2fab7](https://github.com/chelonejs/chelone/commit/8f2fab7c1cd83330d1f113edf5393494e9933d44))
* **vue:** read number and date input buffer text through textOf ([36b42d4](https://github.com/chelonejs/chelone/commit/36b42d4f6e34175a40e57d589dc07e50cde6e582))
* **vue:** release SaveButton's form subscription through subscribeStore ([3b915d3](https://github.com/chelonejs/chelone/commit/3b915d394ac0f52802cdc404145a431698f4c92c))
* **vue:** the admin shell's slots return VNode[] ([3f24426](https://github.com/chelonejs/chelone/commit/3f24426805783bc30f500633d79ac646afa6028c))
* **vue:** the auth, button, feedback and guesser slots return VNode[] ([49c2359](https://github.com/chelonejs/chelone/commit/49c235928531c60d41edbacae65a125629486dc8))
* **vue:** the first eleven display fields are generic in their record ([5b243e0](https://github.com/chelonejs/chelone/commit/5b243e0bf857d2d2ec451885101372412bf6d931))
* **vue:** the form context carries the tagged handle and useFormHandle narrows it ([893e2f0](https://github.com/chelonejs/chelone/commit/893e2f04eb43061b75a2494f42456616c85a7b22))
* **vue:** the layout, realtime, supabase and mdx slots return VNode[] ([c9b2c1e](https://github.com/chelonejs/chelone/commit/c9b2c1ed4b846e3e42ec7c6725da788e681d518c))
* **vue:** the maps-draw files import their GeoJSON types from geojson ([a066ce3](https://github.com/chelonejs/chelone/commit/a066ce31de5199511da2c919334d5128f658db7c))
* **vue:** the second eleven display fields are generic in their record ([5573798](https://github.com/chelonejs/chelone/commit/5573798f643349c739e114aee87565a04a0cc226))
* **vue:** the source-bound inputs share one typed props base ([eb5fd4a](https://github.com/chelonejs/chelone/commit/eb5fd4a98b0eec934740d20e4397ce0e198c1f4e))
* **vue:** type a command's onSelect as returning a promise, drop the casts ([81432b8](https://github.com/chelonejs/chelone/commit/81432b8a6f1a3facd7745a5b8eb07067f25be148))
* **vue:** useList error option takes Error, null or undefined ([46f5231](https://github.com/chelonejs/chelone/commit/46f523152c45b07f0bdff47e46d725fb3a4d880a))
* **vue:** useListContext takes a record type, as React's does ([10214b8](https://github.com/chelonejs/chelone/commit/10214b823c6243052c92da9f401b16b1c9c21b22))
* **vue:** vnode children come from one typed flatten helper ([65e5bf1](https://github.com/chelonejs/chelone/commit/65e5bf12ca84fcccb621a3273a177d388b4ae730))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.7.0
    * @chelone/utils bumped to 0.7.0
  * devDependencies
    * @chelone/supabase bumped to 0.7.0
  * peerDependencies
    * @chelone/supabase bumped to 0.7.0

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
