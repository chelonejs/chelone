# @chelone/core

## [0.9.0](https://github.com/chelonejs/chelone/compare/@chelone/core@0.8.0...@chelone/core@0.9.0) (2026-11-07)


### Chores

* **@chelone/core:** Synchronize chelone versions

## [0.8.0](https://github.com/chelonejs/chelone/compare/@chelone/core@0.7.0...@chelone/core@0.8.0) (2026-11-07)


### Features

* **core:** add isHeadersInit, the guard for a HeadersInit value ([008bb5e](https://github.com/chelonejs/chelone/commit/008bb5ece10d527e8623cb4aaa8114fd669d58dd))
* **core:** erase the choice lists once, in choiceListsOf ([04b9f33](https://github.com/chelonejs/chelone/commit/04b9f33b4cb52b9016dfac6a57f85bb5af0f52b8))
* **demo:** the product form uses the value inputs ([7eef8d8](https://github.com/chelonejs/chelone/commit/7eef8d8d05a580f06102819d9bd84249913285eb))


### Bug Fixes

* a bulk update keeps its own label and the fake provider returns copies ([914f023](https://github.com/chelonejs/chelone/commit/914f0234bdf0e72920537575adc510043317d886))
* **calendar:** a selected day has the same range in both adapters ([6207063](https://github.com/chelonejs/chelone/commit/6207063f8cf3c39d903950dea0c43de1551ff287))
* **core:** an image preview shows a stored raster data URL ([77967d1](https://github.com/chelonejs/chelone/commit/77967d19405ae7dc37d1654517c7ed29e4bc4b4d))
* **core:** read the kanban group key at the top level, as a drop writes it ([81a3cdc](https://github.com/chelonejs/chelone/commit/81a3cdcd5e6ab3922566751ca9ed64778ebe4d73))


### Refactors

* **core,react,vue:** KanbanBoard and BlockDocField take an interface as their record ([d79b5e2](https://github.com/chelonejs/chelone/commit/d79b5e2035eca8468ef3878fdfb27fa4f17d237b))
* **core,react,vue:** map fit defaults have one definition ([5d33ce7](https://github.com/chelonejs/chelone/commit/5d33ce73c3eb5387d05e6a02e42cd17253946208))
* **core,react,vue:** map view defaults and coordinate limits have one definition ([5072a47](https://github.com/chelonejs/chelone/commit/5072a4780a2199475a28d56c2e199051be65f790))
* **core,react,vue:** the shared record types are bounded by ResourceRecord ([0fef358](https://github.com/chelonejs/chelone/commit/0fef358c3e67b58e353b5162b41b03e7ce575a9d))
* **core:** describeResource reads Zod defs through guards, not casts ([0539ffe](https://github.com/chelonejs/chelone/commit/0539ffe35d8152a70341d927c2a97a18d9800317))
* **core:** give the list and reference defaults one definition ([5ee3ace](https://github.com/chelonejs/chelone/commit/5ee3ace38b561a70880efaaeacadc7436f313ab9))
* **core:** inspector, tour and layout constants have one definition ([d28b099](https://github.com/chelonejs/chelone/commit/d28b0994e0ecf510a70626e9e0045c88e929f506))
* **core:** name the block editor, CSV import and key editor constants once ([245e26e](https://github.com/chelonejs/chelone/commit/245e26eb227c5bfe50dd1214809697c21b6705a1))
* **core:** shared UI defaults have one definition ([5d9a470](https://github.com/chelonejs/chelone/commit/5d9a47050bd5e6e3763194834e0adb46fc82a7c3))
* **core:** the login path has one definition ([d1d4d44](https://github.com/chelonejs/chelone/commit/d1d4d44081935a96ef588b00c6d13c021171f230))
* **core:** the Monaco constants have one definition ([cab3668](https://github.com/chelonejs/chelone/commit/cab36681dd1b5e43b118027ef76e5cb89a5b8508))
* **core:** theme and command menu defaults have one definition ([b798c29](https://github.com/chelonejs/chelone/commit/b798c2905aa9474dff484bc8e95b291ad8e87eea))
* **i18n:** put every literal translation key in the catalog ([4406dea](https://github.com/chelonejs/chelone/commit/4406dead064eed911168cebda308bf6368472579))
* **react,vue:** currency, date, duration, email and file fields and DiffViewer take an interface as their record ([cbe1141](https://github.com/chelonejs/chelone/commit/cbe11416751053f506212eb4e6ee8e8897823a09))
* **react,vue:** PivotGrid, RecordTimeline and ApprovalQueue take an interface as their record ([b0273b3](https://github.com/chelonejs/chelone/commit/b0273b3362d2b4b6f8621757055065da24cd6086))
* **react,vue:** reference inputs, InPlaceEditor and JobMonitor take an interface as their record ([864ea4b](https://github.com/chelonejs/chelone/commit/864ea4b9ad6eb664b02680ec2d7ee6a14703d359))

## [0.7.0](https://github.com/chelonejs/chelone/compare/@chelone/core@0.6.0...@chelone/core@0.7.0) (2026-11-06)


### ⚠ BREAKING CHANGES

* **core:** `createFieldBinding`'s `defaultValue` and `parse` are typed by the value at `source`, `FieldBinding.update` takes the binding's own option types, and `FieldBinding.store` reads the binding's record. `CheloneFieldStore` and `FieldBindingUpdateOptions` default to the erased form, so an adapter's `FieldBinding<unknown>` is unchanged.
* **core:** removed Geo* type aliases, see the pull request body.
* **core:** GeoJSON types come from @types/geojson, and a feature's properties are JSON
* **core:** location state is a typed LocationState, read through toLocationState

### Features

* **core:** a form handle tagged by its resource ([ebe376c](https://github.com/chelonejs/chelone/commit/ebe376ce957e3d5e4f2de4495b834e88d67a88f5))
* **core:** add block document registry, defaults, attr descriptors and unknown block round trip ([68fc6b1](https://github.com/chelonejs/chelone/commit/68fc6b1c195abe2b27cf889c07e454aac75d677d))
* **core:** add buildRejectionUpdate beside buildApprovalUpdate ([de90195](https://github.com/chelonejs/chelone/commit/de9019547ce8be8d672d4a1c17142992de560877))
* **core:** add createInspector and moveColumnTo ([3a19b50](https://github.com/chelonejs/chelone/commit/3a19b50b14db81561ece9b26c4862f2b3e1c53a0))
* **core:** add deepEqual for comparing drawn values ([ebbcfca](https://github.com/chelonejs/chelone/commit/ebbcfcae80dfe47f3c58b76cb99bee9fe4f7f7c4))
* **core:** add isSafeFileUrl for file hrefs ([6309cad](https://github.com/chelonejs/chelone/commit/6309cad2a7273b00f22b8498e3251ac4d90ebe04))
* **core:** add rich text image rules, color palette, style filter and code block options ([48f4313](https://github.com/chelonejs/chelone/commit/48f43132b094a27ec43955e39368c4aa7dcc0721))
* **core:** createDataProviderLog records every data provider call with its timing and outcome ([762dfe4](https://github.com/chelonejs/chelone/commit/762dfe4dae7e15897cb25bcc09b674dfd30f8a82))
* **core:** data block specs, field picking and chart aggregation ([b2ecdf3](https://github.com/chelonejs/chelone/commit/b2ecdf3a29d757c25abd0257e726a99ad1232fae))
* **core:** decode streamed assistant chunks ([4137135](https://github.com/chelonejs/chelone/commit/41371350143976f2c90813f4376a08b2cefa9ed5))
* **core:** diffRecords marks each field of two record versions ([c2002ef](https://github.com/chelonejs/chelone/commit/c2002ef6b25c1e5cecb4d0a32323197580c48a3d))
* **core:** export the HTTP assistant transport ([593d989](https://github.com/chelonejs/chelone/commit/593d989b9437851af90cc25cfa1a255bd3602742))
* **core:** post assistant conversations to an app endpoint ([f344373](https://github.com/chelonejs/chelone/commit/f34437358fdee25aaa0ade2df280f7ea26df4e43))
* **core:** read and edit a role's grants for a permission matrix ([4142d6e](https://github.com/chelonejs/chelone/commit/4142d6e18288f7f040b24446abed026f37d64ead))
* **core:** sseTransport receives realtime events over server-sent events ([1e0f939](https://github.com/chelonejs/chelone/commit/1e0f93904bce78507ec3483b14f9969e61e5468d))
* **core:** step the in-place editor and plan a save of only the changed fields ([3b5a765](https://github.com/chelonejs/chelone/commit/3b5a7655b10dc99166deaf97455ce8176adf4f4c))
* **core:** webSocketTransport carries realtime events over a WebSocket and reconnects with backoff ([0f05328](https://github.com/chelonejs/chelone/commit/0f053289acd93343dff35ffbbd6edf2afed40fd0))
* **react:** add the block-editor add-on with BlockEditorInput and BlockDocField ([7d8d431](https://github.com/chelonejs/chelone/commit/7d8d4311b415c52f1aea15ebe68c220dd41c6b70))
* **vue:** insert and upload rich text images ([8ae3f53](https://github.com/chelonejs/chelone/commit/8ae3f53c9cc222af86238a60f9176f557e349067))
* **vue:** reference record and record list data blocks for the block editor ([5c0b0a3](https://github.com/chelonejs/chelone/commit/5c0b0a3652ac2e7c95f29886af4869e0f2b4760c))
* **vue:** resize and view rich text images safely ([6ce161a](https://github.com/chelonejs/chelone/commit/6ce161a0cd4048ec6588d6ac9142dfe7ab4f5227))


### Bug Fixes

* **core,react,vue:** a partially valid FK array keeps the ids it has ([2976a9d](https://github.com/chelonejs/chelone/commit/2976a9da1f500971c072aa1a33bd268258164fc7))
* **core,react,vue:** format is told about the holes a field can hold ([6ac440a](https://github.com/chelonejs/chelone/commit/6ac440af2c0582b8d39e699fa9f2f55f9b9f8da7))
* **core,react,vue:** keep the webhook seed for a null default and a stored amount without a currency ([bfefe1b](https://github.com/chelonejs/chelone/commit/bfefe1bca01ee65eaf8be3909b4b2a3ab4627bc8))
* **core,react:** save's call-time options reach the composed form submit ([217d2c7](https://github.com/chelonejs/chelone/commit/217d2c7afc3d6f455d3d1552f6cccd9a647f50de))
* **core,supabase:** let getPermissions resolve undefined so the Supabase provider fits a registered AuthProvider ([038b0a5](https://github.com/chelonejs/chelone/commit/038b0a596037eeca3e99916421507ea983bf9f51))
* **core:** a second submit while save is in flight no longer saves twice ([0fa12f6](https://github.com/chelonejs/chelone/commit/0fa12f62311f08aa35c02b6b8698235fb8963e8b))
* **core:** cancel assistant response readers on abort ([da9fd9c](https://github.com/chelonejs/chelone/commit/da9fd9c9f8361a5c8e0b8b7525df0af559db0677))
* **core:** complete assistant turns at the end of a stream ([82ca4bd](https://github.com/chelonejs/chelone/commit/82ca4bd4efbe150d9a506b1b0161c80a321c1bea))
* **core:** end aborted assistant requests quietly ([c04dfee](https://github.com/chelonejs/chelone/commit/c04dfee5156e0a50d446ec8847af8a5fbdf51127))
* **core:** end paused assistant iterators after abort ([b52b30a](https://github.com/chelonejs/chelone/commit/b52b30a19cae80e44e4f4ac0d5e2bf37c4863c61))
* **core:** fromEditorFeatures leaves out a feature whose stored properties are damaged ([366f919](https://github.com/chelonejs/chelone/commit/366f919307aa209ca1a9cc719d843dac44eb1af3))
* **core:** honour allowBase64, svg mime parameters and inherited subtypes in rich text extras ([8619797](https://github.com/chelonejs/chelone/commit/8619797a62e883299416e6970b42b8d31914758b))
* **core:** keep a stored URL string as a file entry ([6110dd9](https://github.com/chelonejs/chelone/commit/6110dd9df1b229282beda49110aa7f55d71a8cc0))
* **core:** keep valid form error args when one value is not a message param ([a25e17c](https://github.com/chelonejs/chelone/commit/a25e17cc42a078ea22d8b964d1195a029835bdf2))
* **core:** name the line of invalid assistant chunks ([8f5f88f](https://github.com/chelonejs/chelone/commit/8f5f88ff048bc774e24c02c7c91ce0f8f4c12d66))
* **core:** put the type-escape marker on the line above the cast ([be19dc1](https://github.com/chelonejs/chelone/commit/be19dc1dd1370826ea6d81196c08267487f9f03e))
* **core:** read a field schema's async outcome as any thenable ([847210c](https://github.com/chelonejs/chelone/commit/847210c1a800c6f03a49962d60bf1dc7b933405c))
* **core:** read SourceValue of a type-parameter path without exceeding instantiation depth ([6bc8c39](https://github.com/chelonejs/chelone/commit/6bc8c39e7dfc2b8ace13a2b62539b573ec4900de))
* **core:** report assistant HTTP failures with status and body ([482a4d3](https://github.com/chelonejs/chelone/commit/482a4d3d93a5283e8bed3318bc1152b228006e3e))
* **core:** retry a failed assistant turn without repeating the user message ([37231d4](https://github.com/chelonejs/chelone/commit/37231d43d2ea812561ec88c995bc8a87b816e6d1))
* **core:** say what a provider must declare to read a record in canAccess ([d6c76fa](https://github.com/chelonejs/chelone/commit/d6c76faa1dbf23367eac2b240aff42807aa98a82))
* **core:** SourceTransformValue names the value a transform may carry ([eaf0398](https://github.com/chelonejs/chelone/commit/eaf0398e5dbcc9e0ef19d1ec511eeeee30d0816e))
* **core:** sseTransport keeps its backoff across resubscribes and token failures ([61c3f2e](https://github.com/chelonejs/chelone/commit/61c3f2e8dfe47cca460df0255f4a0ab082b73b9e))
* **core:** two invalid dates compare as equal ([71f9edb](https://github.com/chelonejs/chelone/commit/71f9edb018645a8db902a6557a134417223c6eea))
* **core:** wrap the prototype methods of a class-based provider ([04d479b](https://github.com/chelonejs/chelone/commit/04d479b2a666c5af9f2b3d11ecf4225ef5d879db))
* **react:** keep blocks the schema cannot load, and keep blank lines on a cleared edit ([2e0de5d](https://github.com/chelonejs/chelone/commit/2e0de5d6b6f580e0ee497c67ad26cd5b8f78b4a1))
* **react:** reconnect and status keep working on a provider without publish ([50c7445](https://github.com/chelonejs/chelone/commit/50c7445d4df29ff5d68a01abc5264ce9a57dfeab))
* **vue:** follow reactive rich text image settings ([681f618](https://github.com/chelonejs/chelone/commit/681f6181ef3f6400b5c185790111ff83abe2f3ed))
* **vue:** run useFormHandle's narrowing under test and leave filter forms unbound ([0ed3b09](https://github.com/chelonejs/chelone/commit/0ed3b097cd20663d803abb337f8b9309d32b4229))


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
* **core,react,vue:** scan the error map in one place ([c8c5208](https://github.com/chelonejs/chelone/commit/c8c5208ddc8b3f13c75cc112004677017002cb19))
* **core,react,vue:** shallowEqual lives in core and both adapters re-export it ([b2d415f](https://github.com/chelonejs/chelone/commit/b2d415fc3a7deeb22d8a975fb9dd5161ee52ed3b))
* **core,react,vue:** the date, date-time and time formatters live in core ([10085e0](https://github.com/chelonejs/chelone/commit/10085e00021fbc53cfa5358d05640f4b8025cbcd))
* **core,react,vue:** the draw editor takes and gives typed JSON features, with no cast ([7d3f31a](https://github.com/chelonejs/chelone/commit/7d3f31a7a8dc495a81e98e5b80673c46086bc35f))
* **core,react,vue:** turf takes and returns core's GeoJSON types without a cast ([3bb797f](https://github.com/chelonejs/chelone/commit/3bb797f38b88a80942d799e3f5e792936b998f9c))
* **core,react,vue:** workflow and kanban rules read typed record keys ([779b190](https://github.com/chelonejs/chelone/commit/779b190356843ac57b53878052dd19a81da8b402))
* **core,rest,supabase:** use isRecord for the last four object checks ([ae12a1a](https://github.com/chelonejs/chelone/commit/ae12a1a3c7c05b76577fbe626fe596849c193e62))
* **core,supabase:** getPermissions resolves the app's registered permissions type ([8710cd0](https://github.com/chelonejs/chelone/commit/8710cd094da169fbfd94916632032ba71e780874))
* **core,supabase:** narrow filter walks with guards instead of casts ([fd2077c](https://github.com/chelonejs/chelone/commit/fd2077cbbb4a66e2a68ebc4c416473056fd3c565))
* **core,supabase:** one isFilterBranch decides which filter values nest ([e4654d5](https://github.com/chelonejs/chelone/commit/e4654d5e729f702358a5892132f40c1d4b6b5c9d))
* **core,vue:** type optimistic cache writes by the resource's record ([b140a8a](https://github.com/chelonejs/chelone/commit/b140a8a0a78e5f1f1fa156002daec25933b369a2))
* **core:** bounds, area math, constraint args and the throttle name their types ([8f0771c](https://github.com/chelonejs/chelone/commit/8f0771c857d0993b017a880955d4334d4410d78e))
* **core:** bounds, bbox and constraints use geojson names, and LngLatBox names a four-number box ([82fce98](https://github.com/chelonejs/chelone/commit/82fce98dcdddd9c9f588fd9369719b19843a0567))
* **core:** check index and map reads instead of casting them ([6e72853](https://github.com/chelonejs/chelone/commit/6e72853120a21855dd4f5220c84ceccf41dccbd6))
* **core:** choice value guards shared by both adapters ([b4b1588](https://github.com/chelonejs/chelone/commit/b4b1588e7b27b7e1c349e1bc06ba40cfed4ef75f))
* **core:** controller states carry the query's Error and the record base type ([dd291bb](https://github.com/chelonejs/chelone/commit/dd291bba82cbbb0fb2025e1e32019d5785ffd2fe))
* **core:** core no longer exports the Geo* types ([5b59118](https://github.com/chelonejs/chelone/commit/5b591185e43f330176a15663da229ad42c62e4bd))
* **core:** field bindings carry the value at their source ([311f249](https://github.com/chelonejs/chelone/commit/311f2491c5c538d3d47eacc8c38db6cc03aeef85))
* **core:** firstFieldError moves to core, shared by both adapters ([1022536](https://github.com/chelonejs/chelone/commit/1022536feba4a59828e2299d87725770113359d5))
* **core:** GeoJSON types come from @types/geojson, and a feature's properties are JSON ([14c632a](https://github.com/chelonejs/chelone/commit/14c632a3cda2037777fb2281c69b0076e34b814f))
* **core:** getDirtyFormValues keeps the form's value type ([4ecac58](https://github.com/chelonejs/chelone/commit/4ecac587558e9bdcb153d814074ec74760cc80cb))
* **core:** keep form-core's validator and error-map types in the submit pipeline ([cac6168](https://github.com/chelonejs/chelone/commit/cac6168ce807b69b330dc09fe7b4fff4853ddefd))
* **core:** location state is a typed LocationState, read through toLocationState ([8d8f98e](https://github.com/chelonejs/chelone/commit/8d8f98e72e267a2c10c9fd37710b1aac110ccd54))
* **core:** notify a failed choices fetch through notifyFetchError ([aea82c0](https://github.com/chelonejs/chelone/commit/aea82c06ffa641f6f33bbfb26a1578217d36b88a))
* **core:** one file speaks form-core's path types ([d8c950a](https://github.com/chelonejs/chelone/commit/d8c950af94a29ccfbc1a090ab22db31afcab899b))
* **core:** one guards file answers the object questions once ([b73fc26](https://github.com/chelonejs/chelone/commit/b73fc26f985e0340f9ceacb371dd168a33922d2b))
* **core:** re-export the GeoJSON types its guards accept ([1689e1c](https://github.com/chelonejs/chelone/commit/1689e1cdbce0fd6d3954a70cf10bfa8b8204ac08))
* **core:** read Nominatim, OSRM and constraint values with guards ([113064b](https://github.com/chelonejs/chelone/commit/113064b564cdc7d3a5186200c60afd92b6a3b549))
* **core:** share one removeEmpty across the list, client list and choices controllers ([38c0cee](https://github.com/chelonejs/chelone/commit/38c0cee8fe3bf6bb4c6f151d6e10739bd6111b5a))
* **core:** share the end-color-on-Enter plugin hooks between adapters ([9e3be93](https://github.com/chelonejs/chelone/commit/9e3be93f6d00e413483b57df752ca67f1d3bc403))
* **core:** small helpers take the types their callers already pass ([a3de5d4](https://github.com/chelonejs/chelone/commit/a3de5d469b49ded2b36bd3909c28f6f1e24bdf0b))
* **core:** SourceValue leaves bare string paths to dot.paths 0.2.2 ([904a2a3](https://github.com/chelonejs/chelone/commit/904a2a31eebb1e1ca958dc4e5fab6ca6e939362d))
* **core:** SourceValue reads through dot.paths' Get ([78f3fde](https://github.com/chelonejs/chelone/commit/78f3fde6568408641e405a2936379cc22ed989e0))
* **core:** the command registry's type parameters have no defaults ([f05c722](https://github.com/chelonejs/chelone/commit/f05c7220b26419d23399de1634be8ad908bbcd18))
* **core:** the edit and create controllers merge defaults without casts ([300d786](https://github.com/chelonejs/chelone/commit/300d78648e9ff5970cafb2bd2034e123797c9140))
* **core:** translate params are string or number values ([43a85a0](https://github.com/chelonejs/chelone/commit/43a85a05b197e6b0979caa0ad00880449247ca64))
* **core:** type bindings, validators and controllers by path ([e457fb2](https://github.com/chelonejs/chelone/commit/e457fb293cc007aa87dde95abbb57c192fa77cf3))
* **core:** use geojson names in shape values, routing, geocoding, layers and presets ([bef007e](https://github.com/chelonejs/chelone/commit/bef007e08521606f8b6d3409fa5403b70a224018))
* **core:** withLifecycleCallbacks wraps each verb with typed callbacks ([f921e38](https://github.com/chelonejs/chelone/commit/f921e3814d6bbd3c0dbff0d00e152a3e913b5857))
* **react,vue:** adapters take TranslateParamValues for translate params ([d39edb2](https://github.com/chelonejs/chelone/commit/d39edb262c8d08c027733dca2e753114f8036cfd))
* **react,vue:** call core deepEqual from the drawing inputs ([414e6a6](https://github.com/chelonejs/chelone/commit/414e6a6d6b7f956031cd1c0b8fc6dc7af59bed37))
* **react,vue:** Create and Edit are generic in their record ([3916e23](https://github.com/chelonejs/chelone/commit/3916e23c2dd5b4b2bed38cb39625a19d5a81a22d))
* **react,vue:** redirect and link callbacks receive the record they act on ([7172436](https://github.com/chelonejs/chelone/commit/7172436d4389bf5b5b286bd14ced1e36e843b52e))
* **react,vue:** reference fields read their key and records without casts ([63b5a57](https://github.com/chelonejs/chelone/commit/63b5a576b362bfa894b5d8ec46b3221d3cef09c3))
* **react,vue:** view, save and record contexts default to ResourceRecord ([35e7940](https://github.com/chelonejs/chelone/commit/35e7940a7a61b5593f097f5b4d1d8fd50ee2b1c4))
* **react:** carry the tagged form handle in the form context ([b09fe94](https://github.com/chelonejs/chelone/commit/b09fe94f049844f88db9fa004a405ad7539a7cec))
* **react:** number, boolean and file inputs read and parse typed values ([7acc426](https://github.com/chelonejs/chelone/commit/7acc4263ed255a7a9f61e44ff559408be04f9226))
* **react:** the first five fields read and take defaults typed by the record ([0ff194e](https://github.com/chelonejs/chelone/commit/0ff194ecfd38a94587944c78d8656004e324abdd))
* **vue:** choice inputs type the field and the choice values ([9698d72](https://github.com/chelonejs/chelone/commit/9698d72c8cdf92772a7e9dd8aba59e4e9fb9d418))
* **vue:** the form context carries the tagged handle and useFormHandle narrows it ([893e2f0](https://github.com/chelonejs/chelone/commit/893e2f04eb43061b75a2494f42456616c85a7b22))

## [0.6.0](https://github.com/chelonejs/chelone/compare/@chelone/core@0.5.0...@chelone/core@0.6.0) (2026-11-04)


### Features

* **core:** add buildPivotTable and formatPivotValue ([c87c90f](https://github.com/chelonejs/chelone/commit/c87c90f047037b8bb3c3656877b90961b8352e35))
* **core:** add chart data helpers for rows, donut slices and metric delta ([c5e11d9](https://github.com/chelonejs/chelone/commit/c5e11d919e3a4f1a832ae83ffe49c1c0f1dc1119))
* **core:** add createTourController and placeTourCard ([77a1ba4](https://github.com/chelonejs/chelone/commit/77a1ba459be7a6bf3ec33465532417f937d19184))
* **core:** broadcastChannelTransport carries realtime events between tabs ([6403855](https://github.com/chelonejs/chelone/commit/6403855cd6853ca90937af758604e5523841d76d))
* **core:** createAssistantSession streams a reply and runs its tool calls ([ec43e75](https://github.com/chelonejs/chelone/commit/ec43e75ca393af8d30d3c2fc4d0c37f1f0d95881))
* **core:** getJobActions, planJobRetry and planJobCancel decide what a job monitor may do to a job ([605c4ac](https://github.com/chelonejs/chelone/commit/605c4ace1984d3f0538acf2b1d496c171970daeb))
* **core:** report a missing i18n key and collect the misses for export ([f073893](https://github.com/chelonejs/chelone/commit/f073893ebac7366c080b9e0bc04c63e25d5b0443))
* **core:** rich text gets link and image URL checks, sanitize options, editor options and the toolbar item list ([6b1b48b](https://github.com/chelonejs/chelone/commit/6b1b48b9173f392f1ab588c7339980bfead0e05e))
* **core:** toTimelineEntries reads timeline entries from records, formatRelativeTime moves to core ([b381402](https://github.com/chelonejs/chelone/commit/b3814020784ecd2ddb543da95110dc581e5b14c5))


### Bug Fixes

* **core:** assign the entries map outside the expression ([4ee87e1](https://github.com/chelonejs/chelone/commit/4ee87e15b64f126cf2875cfdb4ceb3af34c08607))
* **core:** destroy and stop end an assistant turn that is waiting on a tool ([0b34079](https://github.com/chelonejs/chelone/commit/0b3407911ebf59b15018dd4663e7269a84acad65))
* **core:** drop a cast in the missing-keys test that the type-escape ratchet counts ([15adfa3](https://github.com/chelonejs/chelone/commit/15adfa344b2e7161354d60db7d9444b8093c4997))
* **core:** guard empty chart colors and missing donut labels ([eeac6bd](https://github.com/chelonejs/chelone/commit/eeac6bd58069d33014c6efc61bf8a7486e77db57))
* **core:** make auto placement skip sides the card does not fit on ([23156ef](https://github.com/chelonejs/chelone/commit/23156eff689b6886d597ca3e19c2ae76a7f7a2ba))
* **core:** sort negative and decimal pivot keys by value ([8ca7e72](https://github.com/chelonejs/chelone/commit/8ca7e72946d98841a6070526cc4e70f386ab1d7a))
* **core:** the link toolbar item has no shortcut ([ec46631](https://github.com/chelonejs/chelone/commit/ec4663134e38b600c9429dc549f918a3158ac21a))
* **core:** type assistant tool arguments and results as JSON, not unknown ([9bf999a](https://github.com/chelonejs/chelone/commit/9bf999a29f3ca8a17d39c078ffd6b21aba99f120))
* **core:** type chart data helpers exactly so the type-escape check passes ([46b869d](https://github.com/chelonejs/chelone/commit/46b869d8767475b61088bca59d8c8eac1b12453e))
* **react:** remove the type escapes the kanban move added ([5c2a92a](https://github.com/chelonejs/chelone/commit/5c2a92a7fbed1eb9cc3afa835155f1fb649e83bc))


### Refactors

* **core:** move the lock announcement into announceLock ([7bb0192](https://github.com/chelonejs/chelone/commit/7bb01925e408d4cb7a9412d4eaf8bdd4a0e24540))
* **core:** partial-apply hydration writes through the typed form ([91ddbcb](https://github.com/chelonejs/chelone/commit/91ddbcbd162a6b5d7531bc18d0a1daa2189dfccd))
* **core:** read cache op row fields without casts ([aaa8050](https://github.com/chelonejs/chelone/commit/aaa8050a66935e9f34800fc16534966e0549811b))

## [0.5.0](https://github.com/chelonejs/chelone/compare/@chelone/core@0.4.0...@chelone/core@0.5.0) (2026-11-04)


### Chores

* **@chelone/core:** Synchronize chelone versions

## [0.4.0](https://github.com/chelonejs/chelone/compare/@chelone/core@0.3.0...@chelone/core@0.4.0) (2026-11-04)


### Features

* **core,react,vue:** CalendarList and TreeList take their sources typed by the record ([ddda9a0](https://github.com/chelonejs/chelone/commit/ddda9a04ca7e59de59b985ae18efd011fcf6c4a6))
* **core:** buildKanbanBuckets sorts records into columns and planKanbanMove decides what a drop writes ([189c0ef](https://github.com/chelonejs/chelone/commit/189c0ef3a3fd471c0ec2a2feca5f7015ca5c1659))

## [0.3.0](https://github.com/chelonejs/chelone/compare/@chelone/core@0.2.0...@chelone/core@0.3.0) (2026-11-04)


### Features

* **core:** defineResources rejects a references key that is not a field and a target that is not a resource ([1470949](https://github.com/chelonejs/chelone/commit/14709493e8af1ca96cc821a913e8a165996480f8))
* **core:** type the approval and transition sources as top-level record keys ([b50959e](https://github.com/chelonejs/chelone/commit/b50959ef61d437f589116c0b922b7a9af5d8a3a5))


### Bug Fixes

* **core:** an optimistic update patches the cached lists and restores only its own rows on error ([c3ba97b](https://github.com/chelonejs/chelone/commit/c3ba97b15479cecf74be36a187a4e1137cd1ad43))
* **core:** an optimistic update patches the cached lists and restores only its own rows on error ([00ba897](https://github.com/chelonejs/chelone/commit/00ba89790bf04a7554452370c593f586c278f47c))
* **core:** count unsettled optimistic updates instead of reading isMutating ([7467f2c](https://github.com/chelonejs/chelone/commit/7467f2c441eeadad3ca17f402f9a1cbb47e25fca))
* **core:** let buildApprovalUpdate write a status field the record lacks ([69d0ef6](https://github.com/chelonejs/chelone/commit/69d0ef61b509cfba75de03871e026414986155fa))


### Refactors

* **core:** fold the path segment walker into getAtPath ([4a7d8e6](https://github.com/chelonejs/chelone/commit/4a7d8e6d2056485290adece92ed30fc3816e1132))
* **core:** type createFieldBinding and createArrayBinding sources by their form's record ([915e86d](https://github.com/chelonejs/chelone/commit/915e86d860696d283c873aff478b51e7b7365b99))
* **core:** type createFieldBinding and createArrayBinding sources by their form's record ([af1425f](https://github.com/chelonejs/chelone/commit/af1425fa8897681170344658d7bcbd8526646a03))
* **react,vue:** read record paths through core's getAtPath ([26c3e3d](https://github.com/chelonejs/chelone/commit/26c3e3d626e7dde61b72cf85a85f84ec91d474da))

## [0.2.0](https://github.com/chelonejs/chelone/compare/@chelone/core@0.1.1...@chelone/core@0.2.0) (2026-11-03)


### Features

* **core:** read a record path with one bracket-or-dot reader ([38f886c](https://github.com/chelonejs/chelone/commit/38f886c927463fefe6e385efdc9fc1ad7009a5d6))
* **core:** type a source against a registered resource's record ([67083dd](https://github.com/chelonejs/chelone/commit/67083dd4cd732695c8b78d1f1e056a55bfd79282))
* **core:** type a source against a registered resource's record ([ac77369](https://github.com/chelonejs/chelone/commit/ac7736965743c9d85fbdba3c744e5a4b101385c1))


### Bug Fixes

* **core:** a dot-index source binds the bracket field name ([7604cf3](https://github.com/chelonejs/chelone/commit/7604cf37dfa301ee9dadee51c1a694d2b7f4bb24))
* **core:** a dot-index source binds the bracket field name ([2ed8bca](https://github.com/chelonejs/chelone/commit/2ed8bca1911fa653ea4fa89c705891499bc2eb57))
* **core:** an Admin with no i18n reads in English instead of raw ra.* keys ([e5a9a1b](https://github.com/chelonejs/chelone/commit/e5a9a1bad78833a8b6d993511301ed5b5a6ff764))
* **core:** an Admin with no i18n reads in English instead of raw ra.* keys ([5476725](https://github.com/chelonejs/chelone/commit/54767256e35bb7c3b6d56eecff01e9411a1617f4))
* **core:** keep an open array item out of RowSourcePath ([b7e14ca](https://github.com/chelonejs/chelone/commit/b7e14ca676aadf2caf484614e61a8b9b821eb462))
* **core:** one path reader reads a bracket or dot-index source ([1003ae1](https://github.com/chelonejs/chelone/commit/1003ae17ab8a71b2008c2a6586e53c194fa51bda))


### Refactors

* **core:** the tree, calendar and client-list readers use getAtPath ([016a9ee](https://github.com/chelonejs/chelone/commit/016a9ee9b0194ce337a8c9b18fb44790d0241078))

## 0.1.1

### Patch Changes

- An undoable mutate runs the `onSuccess`, `onError` and `onSettled` it is given, with the setup shared in core
- A throwing `onSettled` no longer fails an undoable that already committed
- The calendar list restores its own `perPage` after a reload

## 0.1.0

### Minor Changes

- 7d585f2: First release.
