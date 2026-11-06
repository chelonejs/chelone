:robot: I have created a release *beep* *boop*
---


<details><summary>@chelone/core: 0.7.0</summary>

## [0.7.0](https://github.com/chelonejs/chelone/compare/@chelone/core@0.6.0...@chelone/core@0.7.0) (2026-11-06)


###   BREAKING CHANGES

* **core:** `createFieldBinding`'s `defaultValue` and `parse` are typed by the value at `source`, `FieldBinding.update` takes the binding's own option types, and `FieldBinding.store` reads the binding's record. `CheloneFieldStore` and `FieldBindingUpdateOptions` default to the erased form, so an adapter's `FieldBinding` of `unknown` is unchanged.
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
</details>

<details><summary>@chelone/react: 0.7.0</summary>

## [0.7.0](https://github.com/chelonejs/chelone/compare/@chelone/react@0.6.0...@chelone/react@0.7.0) (2026-11-06)


###   BREAKING CHANGES

* **core:** removed Geo* type aliases, see the pull request body.
* **core:** GeoJSON types come from @types/geojson, and a feature's properties are JSON
* **core:** location state is a typed LocationState, read through toLocationState

### Features

* **onboarding-tour:** expose start() through a ref in React and Vue ([cd51798](https://github.com/chelonejs/chelone/commit/cd51798673a32668110bac9b4f1c0252dec516f4))
* **react,vue:** MetricCard shows a headline number with its change ([a7ed6ee](https://github.com/chelonejs/chelone/commit/a7ed6eeba0573fbc8b956e3dcf661ac56fc12cff))
* **react:** a drag handle moves a block in the block editor ([5ff01c9](https://github.com/chelonejs/chelone/commit/5ff01c9a73a48c510407d4497f58f129494697e5))
* **react:** add a /charts add-on with TrendChart on recharts as an optional peer ([c2dcdf5](https://github.com/chelonejs/chelone/commit/c2dcdf537e710ff47e859accc4a074c012ab23f0))
* **react:** add Assistant chat panel over the core session ([1aea0f0](https://github.com/chelonejs/chelone/commit/1aea0f066d19304b503cdffe2811044d17060177))
* **react:** add BarChart and DonutChart to the /charts add-on ([2af41ae](https://github.com/chelonejs/chelone/commit/2af41ae61b6d84f7cbbe4ae28afb8e7c2f6c98f5))
* **react:** add InPlaceEditor that edits a shown value where it is ([5ebaa6d](https://github.com/chelonejs/chelone/commit/5ebaa6d7b0d23c3dc8b97d61e02b2f931a1e41e8))
* **react:** add OnboardingTour that highlights one element per step ([4fd8967](https://github.com/chelonejs/chelone/commit/4fd8967d69c4539873408ffe3baf23d4a9aae85f))
* **react:** add the block-editor add-on with BlockEditorInput and BlockDocField ([7d8d431](https://github.com/chelonejs/chelone/commit/7d8d4311b415c52f1aea15ebe68c220dd41c6b70))
* **react:** add the rich-text-input add-on with a sanitized RichTextField ([3a7389c](https://github.com/chelonejs/chelone/commit/3a7389c6da14308c8bb7c506cd4b0b47b781b490))
* **react:** an inspector add-on gives Inspector, InspectorButton, Configurable and SortableFieldsSelector ([acf8b27](https://github.com/chelonejs/chelone/commit/acf8b27cfef958be8dc5635fe1f09212486129da))
* **react:** ApprovalQueue shows a row per record with Approve and a Reject that asks for a reason ([ca8bfed](https://github.com/chelonejs/chelone/commit/ca8bfed48c9c725023dd20ad8d932ae58370ccdd))
* **react:** block editor default blocks and a block toolbar ([e3befb3](https://github.com/chelonejs/chelone/commit/e3befb3d214e6d2622c8ec88cf4f08f01027b46c))
* **react:** color text from a palette and highlight code blocks in RichTextInput ([b1c2f18](https://github.com/chelonejs/chelone/commit/b1c2f189f39c0dd754d2f83881cb547bacdbca73))
* **react:** ConfigurableInputs hides and reorders the inputs of a form ([5abe4a4](https://github.com/chelonejs/chelone/commit/5abe4a49a096a3febee4df0865215c0c2990677b))
* **react:** DataProviderDevtools shows the logged data provider calls in a floating panel ([b6df84d](https://github.com/chelonejs/chelone/commit/b6df84d2d7301964d51a623813403c6fdd1dc4e7))
* **react:** DiffViewer shows two versions of a record side by side or inline ([891c525](https://github.com/chelonejs/chelone/commit/891c52557cb7ebdeb626dab6f03b3dc83a8b2e39))
* **react:** I18nKeyEditor lists the missing keys of the current locale and copies the typed translations as JSON ([607907f](https://github.com/chelonejs/chelone/commit/607907fedd441ba26c20b59e3a747047b88826f0))
* **react:** insert, upload, resize and view images in RichTextInput ([e1d9e27](https://github.com/chelonejs/chelone/commit/e1d9e271a955c2ae466c06ca9bdf2eedcaf7baeb))
* **react:** JobMonitor polls a jobs resource and retries or cancels a job from its status tab ([28e8acf](https://github.com/chelonejs/chelone/commit/28e8acfdecaba82bb2ea5a6d89e211dcdfe4b6ab))
* **react:** PermissionMatrix shows a tab per role and toggles each resource and action grant ([d2883af](https://github.com/chelonejs/chelone/commit/d2883aff13efe064dd99d231904d941414f89088))
* **react:** RecordTimeline shows the records of a list as a dated activity list ([8d2b54f](https://github.com/chelonejs/chelone/commit/8d2b54f426bacf836065848d05436eb3496aa271))
* **react:** reference record, record list and chart data blocks for the block editor ([2545357](https://github.com/chelonejs/chelone/commit/2545357fc74ea25b7a88dc18e22e2db87f3e2ff9))
* **react:** RichTextInput edits an HTML string in a tiptap editor with a formatting toolbar ([e330df1](https://github.com/chelonejs/chelone/commit/e330df141f7797503ca1b2af6994753c21a705ca))
* **react:** take FieldsSelector out of ColumnsButton ([3395c85](https://github.com/chelonejs/chelone/commit/3395c859b57a567acad8442a89c63ce848478ca6))
* **vue:** insert and upload rich text images ([8ae3f53](https://github.com/chelonejs/chelone/commit/8ae3f53c9cc222af86238a60f9176f557e349067))
* **vue:** reference record and record list data blocks for the block editor ([5c0b0a3](https://github.com/chelonejs/chelone/commit/5c0b0a3652ac2e7c95f29886af4869e0f2b4760c))
* **vue:** resize and view rich text images safely ([6ce161a](https://github.com/chelonejs/chelone/commit/6ce161a0cd4048ec6588d6ac9142dfe7ab4f5227))


### Bug Fixes

* **core,react,vue:** a partially valid FK array keeps the ids it has ([2976a9d](https://github.com/chelonejs/chelone/commit/2976a9da1f500971c072aa1a33bd268258164fc7))
* **core,react,vue:** format is told about the holes a field can hold ([6ac440a](https://github.com/chelonejs/chelone/commit/6ac440af2c0582b8d39e699fa9f2f55f9b9f8da7))
* **core,react,vue:** keep the webhook seed for a null default and a stored amount without a currency ([bfefe1b](https://github.com/chelonejs/chelone/commit/bfefe1bca01ee65eaf8be3909b4b2a3ab4627bc8))
* **core,react:** save's call-time options reach the composed form submit ([217d2c7](https://github.com/chelonejs/chelone/commit/217d2c7afc3d6f455d3d1552f6cccd9a647f50de))
* **core:** keep a stored URL string as a file entry ([6110dd9](https://github.com/chelonejs/chelone/commit/6110dd9df1b229282beda49110aa7f55d71a8cc0))
* **core:** retry a failed assistant turn without repeating the user message ([37231d4](https://github.com/chelonejs/chelone/commit/37231d43d2ea812561ec88c995bc8a87b816e6d1))
* **react,vue:** `CanAccess` takes a record with its fields ([3d61916](https://github.com/chelonejs/chelone/commit/3d619161d8b00b8636498270fbf0316e7394f064))
* **react,vue:** gate FileField hrefs through isSafeFileUrl ([a0c8ff5](https://github.com/chelonejs/chelone/commit/a0c8ff525cc6045442eb67cea33812abefceba1e))
* **react,vue:** keep a literal SelectAllButton label out of the fallback ([8cd1c13](https://github.com/chelonejs/chelone/commit/8cd1c130c04a9f3d5edff3f23ab059d441d76a7e))
* **react,vue:** keep a missing FileField/ImageField src a miss ([e3ce201](https://github.com/chelonejs/chelone/commit/e3ce20195927aa1e5fee81fda68b3cb9145deec2))
* **react,vue:** keep ArrayInput a resource member when the record has no required id ([4f24eb1](https://github.com/chelonejs/chelone/commit/4f24eb1718732e70379692a73133458499213c5c))
* **react,vue:** keep the permissions change inside Biome's formatting ([7c281e7](https://github.com/chelonejs/chelone/commit/7c281e7749d1e9da7e3eeafc2c8d71a2c32b9d35))
* **react,vue:** keep the turf peers in the maps-draw registry items ([74167ab](https://github.com/chelonejs/chelone/commit/74167abe194a51c5a6dd1fc27ddcdb9b2b41f431))
* **react,vue:** keep the Vue resolver loose and match React to it ([53c7dfc](https://github.com/chelonejs/chelone/commit/53c7dfc99d249ef9e37bd05a1a995dcae858bd6e))
* **react,vue:** maps-osm registry items list the turf peers utils/osm imports ([7ecd8d5](https://github.com/chelonejs/chelone/commit/7ecd8d526379664c8cf9233143d30b2da2fda432))
* **react:** ApprovalQueue blocks overlapping decisions on a row and hides decisions on a rejected row ([a1ac14a](https://github.com/chelonejs/chelone/commit/a1ac14af40b998234ca4b53bdf35c6f3e48489e9))
* **react:** CurrencyField still formats a composite whose amount is a string ([9bfdc7e](https://github.com/chelonejs/chelone/commit/9bfdc7ee25cd6865f2ae055b4af331522a291e44))
* **react:** FilterButton clears its pending focus timer on unmount ([b79c41a](https://github.com/chelonejs/chelone/commit/b79c41a39f1cfb279ac7ec0e8f43b700579d2d53))
* **react:** FilterButton focuses a shown filter's input at the menu close ([46a7246](https://github.com/chelonejs/chelone/commit/46a72469185089671d9fe0515cf1669ea424712b))
* **react:** FilterButton keeps the trigger's focus when no input can take it ([fa9026f](https://github.com/chelonejs/chelone/commit/fa9026f3953e58fce4e93dfda0a298b50bd9d3c1))
* **react:** format takes the hole an untouched field leaves ([1b83e71](https://github.com/chelonejs/chelone/commit/1b83e718ba414462563138ac23fe06b6f1aedecc))
* **react:** GeoJsonFieldProps and BBoxFieldProps keep a default type argument ([9d6ebcf](https://github.com/chelonejs/chelone/commit/9d6ebcf05b3afe6875520a9fac8ec61268fcc4b3))
* **react:** give the chart test payload the graphicalItemId recharts requires ([562f8a4](https://github.com/chelonejs/chelone/commit/562f8a4b3cd69134e72ab4a7a586ae77c8731fd9))
* **react:** I18nKeyEditor keeps the typed text in the input without waiting for the store ([8c7f40a](https://github.com/chelonejs/chelone/commit/8c7f40a4e3815110fe735675458168dd5ddf5c32))
* **react:** JobMonitor owns its write so a tab switch cannot drop the notification ([d0afaaf](https://github.com/chelonejs/chelone/commit/d0afaaf31ad5177efb145489bc95b2bf4ba262d3))
* **react:** keep blocks the schema cannot load, and keep blank lines on a cleared edit ([2e0de5d](https://github.com/chelonejs/chelone/commit/2e0de5d6b6f580e0ee497c67ad26cd5b8f78b4a1))
* **react:** keep donut labels out of the chart config and key slices by index ([e87f39e](https://github.com/chelonejs/chelone/commit/e87f39e37b4a6ee14e44c86acaa4b1ef8dc77f45))
* **react:** keep focus in the config panel and close it with the bar ([aff73de](https://github.com/chelonejs/chelone/commit/aff73dee37fc65052e128e9f69945aa900fac0a7))
* **react:** keep onBlur and onChange off the CheckboxGroupInput fieldset ([aef0627](https://github.com/chelonejs/chelone/commit/aef06270fb02d0528f5ab955023ba24dc3729463))
* **react:** keep Tab and focus inside the onboarding tour card ([092a149](https://github.com/chelonejs/chelone/commit/092a149f022b7e5cfa1b49d515a460265e2ec0f0))
* **react:** keep the block drag handle lined up with its block ([7e0abb7](https://github.com/chelonejs/chelone/commit/7e0abb79cef2cbefe5db7936e66fd5c75600c3a7))
* **react:** keep the color when Enter splits inside a colored run ([09abe09](https://github.com/chelonejs/chelone/commit/09abe0991970a9c907d66aadec7b2d7ea0ada13c))
* **react:** keep unstored blob images out of the form value and survive undo ([1cd74cd](https://github.com/chelonejs/chelone/commit/1cd74cd886828093999c24737c7417370b1ed8b7))
* **react:** pass ResponsiveContainer children through in the chart test ([47a5d83](https://github.com/chelonejs/chelone/commit/47a5d8386e60e3fbb545d6e95889ccddffbbbea2))
* **react:** pass the editor's blur event to MdxInput's onBlur prop ([74b1d09](https://github.com/chelonejs/chelone/commit/74b1d095414d25425c511475bac5f48881202277))
* **react:** PermissionMatrix survives a removed role, localizes cell labels and disables a fully inherited All ([516feb4](https://github.com/chelonejs/chelone/commit/516feb45c7ed9f890411863a0964f6507519a73c))
* **react:** post one error when an undoable in-place save fails ([0f3be6f](https://github.com/chelonejs/chelone/commit/0f3be6f8ffc2b41f1c1dcbc1daf10c86f0ae2277))
* **react:** react-router adapter reads history state through toLocationState ([d40419a](https://github.com/chelonejs/chelone/commit/d40419ae47899458b6afd98ac9e85922e3b27870))
* **react:** reconnect and status keep working on a provider without publish ([50c7445](https://github.com/chelonejs/chelone/commit/50c7445d4df29ff5d68a01abc5264ce9a57dfeab))
* **react:** RecordTimeline reads only the own keys of icons ([be5a475](https://github.com/chelonejs/chelone/commit/be5a475c5bb98efbf6cae6924300279e101e02a3))
* **react:** registerResource test passes undefined permissions, not null ([a0bc205](https://github.com/chelonejs/chelone/commit/a0bc2054da554f141b7314657e87cd110acfef11))
* **react:** render the inspector editor with its Configurable's contexts ([ecf3833](https://github.com/chelonejs/chelone/commit/ecf38337157282fb56540bd0dd9a93989c34a95f))
* **react:** RichTextInput toolbar follows disabled, the textbox gets a name, the placeholder updates ([90e1e65](https://github.com/chelonejs/chelone/commit/90e1e65dc2774c6635a15a8a78804f3997ddd053))
* **react:** silence the index-key lint on donut cells, with the reason ([a93bfc7](https://github.com/chelonejs/chelone/commit/a93bfc7059539cdab8022fa1ce3a8760fb36608a))
* **react:** TextField, DateField and NumberField take defaultValue typed by the record ([3da4364](https://github.com/chelonejs/chelone/commit/3da43647e85bc2d0d39b2c814bb16ab0c0e59a50))
* **react:** the registered permissions type test adds no unknown ([6d071ad](https://github.com/chelonejs/chelone/commit/6d071add31b92228de44464247f4751013fb2a31))
* **react:** the TanStack adapter uses TanStack's own types ([3f6fde6](https://github.com/chelonejs/chelone/commit/3f6fde636df7feae111a65016e66b96a2e23d343))
* **registry:** an item importing a @chelone/utils subpath lists that subpath's optional peers ([938ee51](https://github.com/chelonejs/chelone/commit/938ee5155650a6f354f9efd8e61f2257d66c8f77))
* **test-utils:** load the drag stubs from their own subpath ([20b9324](https://github.com/chelonejs/chelone/commit/20b93249f1704f91bc3fd0d75acd44d8259f8ebb))
* **vue:** follow reactive rich text image settings ([681f618](https://github.com/chelonejs/chelone/commit/681f6181ef3f6400b5c185790111ff83abe2f3ed))
* **website:** props pages follow the typed defaultValue and transform ([7544272](https://github.com/chelonejs/chelone/commit/75442726cacf3e2c4ae6f513b8183b061a6a6fb3))


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
* **core:** controller states carry the query's Error and the record base type ([dd291bb](https://github.com/chelonejs/chelone/commit/dd291bba82cbbb0fb2025e1e32019d5785ffd2fe))
* **core:** core no longer exports the Geo* types ([5b59118](https://github.com/chelonejs/chelone/commit/5b591185e43f330176a15663da229ad42c62e4bd))
* **core:** firstFieldError moves to core, shared by both adapters ([1022536](https://github.com/chelonejs/chelone/commit/1022536feba4a59828e2299d87725770113359d5))
* **core:** GeoJSON types come from @types/geojson, and a feature's properties are JSON ([14c632a](https://github.com/chelonejs/chelone/commit/14c632a3cda2037777fb2281c69b0076e34b814f))
* **core:** location state is a typed LocationState, read through toLocationState ([8d8f98e](https://github.com/chelonejs/chelone/commit/8d8f98e72e267a2c10c9fd37710b1aac110ccd54))
* **core:** re-export the GeoJSON types its guards accept ([1689e1c](https://github.com/chelonejs/chelone/commit/1689e1cdbce0fd6d3954a70cf10bfa8b8204ac08))
* **core:** share the end-color-on-Enter plugin hooks between adapters ([9e3be93](https://github.com/chelonejs/chelone/commit/9e3be93f6d00e413483b57df752ca67f1d3bc403))
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
* **react,vue:** read the list filter without a cast to a string-keyed Record ([e3e69b8](https://github.com/chelonejs/chelone/commit/e3e69b84805eee287fb2f78b03a84894e2606d3e))
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
* **react:** ArrayField reads its array without a double cast ([6f76956](https://github.com/chelonejs/chelone/commit/6f769562f880efa65185588ec6a37ae155322738))
* **react:** carry the tagged form handle in the form context ([b09fe94](https://github.com/chelonejs/chelone/commit/b09fe94f049844f88db9fa004a405ad7539a7cec))
* **react:** choice inputs type the field and the choice values ([8196073](https://github.com/chelonejs/chelone/commit/81960736d650721a0684193aa3e88741566bd490))
* **react:** CSS custom properties go through a typed cssVars helper ([35889b4](https://github.com/chelonejs/chelone/commit/35889b4726fa1c1c79adb83ac4fd0440e8c46c6d))
* **react:** date and time inputs read and parse typed values ([d9d2459](https://github.com/chelonejs/chelone/commit/d9d245925576b76fbfaf33b4c45144a579fa3e67))
* **react:** drop the casts that restate a type in buttons, layout, views and ui ([9e18bb1](https://github.com/chelonejs/chelone/commit/9e18bb1b31d3c01fd59b20d1501503f5b68d553a))
* **react:** drop the unused resource generic from AdminUI and AdminInner ([d2f8c9b](https://github.com/chelonejs/chelone/commit/d2f8c9b5d07ae73cbf1d70038ddf0fbde547f5c9))
* **react:** Edit and Show read the id from the route without a cast ([fd2cefe](https://github.com/chelonejs/chelone/commit/fd2cefe6b1b1a81d1785342c6fc8898a65bc49b9))
* **react:** FilterButton reads its filter elements and input without casts ([2021966](https://github.com/chelonejs/chelone/commit/202196685b8dc3681871a74d6aea1df024174e9b))
* **react:** guessed fields and inputs render through typed element builders ([eda4d81](https://github.com/chelonejs/chelone/commit/eda4d81e87850d37377dfafd1f07651ddcebf2b8))
* **react:** hand react-router's Route and Routes to the adapter without a cast ([b12ff4b](https://github.com/chelonejs/chelone/commit/b12ff4b53ab18ef8da847cd2288a23494df0fa60))
* **react:** InputProps is generic in its record and its path, and types defaultValue ([772cdd6](https://github.com/chelonejs/chelone/commit/772cdd67250e21bd96a8d5f87f862b32b1977fe0))
* **react:** InputProps types format and parse by the value at source ([aceb175](https://github.com/chelonejs/chelone/commit/aceb1759cd2e6f4bdb69576960907d0ad039522c))
* **react:** ListToolbar clones its actions element with typed props ([7615472](https://github.com/chelonejs/chelone/commit/76154724d777b4dd82a73ad74bf3bfd27845fe78))
* **react:** maps and maps-osm import their GeoJSON types from geojson ([2f1491a](https://github.com/chelonejs/chelone/commit/2f1491a7d19c5b02058d59f9299ce51255d69fc2))
* **react:** maps-draw files import GeoJSON types from geojson ([1ae05ad](https://github.com/chelonejs/chelone/commit/1ae05ad54c99f0a7b7d7b452c8cfad357b90d039))
* **react:** MonacoJsonField hands its lazy body the value, so its props need no double cast ([fb6f933](https://github.com/chelonejs/chelone/commit/fb6f93340e80782176861432bcab8f3bb8be59cb))
* **react:** number, boolean and file inputs read and parse typed values ([7acc426](https://github.com/chelonejs/chelone/commit/7acc4263ed255a7a9f61e44ff559408be04f9226))
* **react:** one SpanFieldProps for the four span fields' defaultValue ([da32d19](https://github.com/chelonejs/chelone/commit/da32d1906e1ecccaee406d146e1f0417f190eada))
* **react:** only format goes loose where the source is unnamed ([c707e5f](https://github.com/chelonejs/chelone/commit/c707e5f21125a9394fd25a3ec1aa5621cc84a936))
* **react:** pass input rest props to sanitizeInputRestProps without a cast ([959d38d](https://github.com/chelonejs/chelone/commit/959d38d921bf8d4fc02bc9f87b879b538b5f4ec3))
* **react:** read window.EyeDropper in the color picker through a type guard ([1766bcb](https://github.com/chelonejs/chelone/commit/1766bcb535a1780422441b7eaf2052cf80fa68c5))
* **react:** reorder UrlField's reads so they stop matching ChipField ([adb001f](https://github.com/chelonejs/chelone/commit/adb001f7a3a25ba7fe868305e1ea39443f1f936b))
* **react:** SelectField reads its typed props without a double cast ([dea90b5](https://github.com/chelonejs/chelone/commit/dea90b55eb7be673e5594f4c0e391c7c469da6a9))
* **react:** share flattenChildren between tab layouts ([cf6b017](https://github.com/chelonejs/chelone/commit/cf6b017fe74ee661b0dac86a0bcb4ea7e45ac54f))
* **react:** share the flat form source scope between forms ([71073a1](https://github.com/chelonejs/chelone/commit/71073a1e8dcaef9d63b580c0071e2eed44b1286e))
* **react:** slot markers and memoized fields keep their types without casts ([1483f92](https://github.com/chelonejs/chelone/commit/1483f92f533e40733ae727a7fb3ab966de777a68))
* **react:** TabbedShowLayout and Labeled narrow their children with isValidElement ([c8a0b63](https://github.com/chelonejs/chelone/commit/c8a0b63c0f12020fea06b2ec5283f2668fdbedff))
* **react:** tests import noop from core instead of declaring their own ([a39b12f](https://github.com/chelonejs/chelone/commit/a39b12fe3add3510a96ff0c54d90e109390b7e87))
* **react:** the first five fields read and take defaults typed by the record ([0ff194e](https://github.com/chelonejs/chelone/commit/0ff194ecfd38a94587944c78d8656004e324abdd))
* **react:** the four inputs inherit the typed defaultValue InputProps gives ([dcddc84](https://github.com/chelonejs/chelone/commit/dcddc8455b7f8ef50c858ea83bab3b3011183f60))
* **react:** the sanitize helpers return the props they did not strip ([85225a5](https://github.com/chelonejs/chelone/commit/85225a50d0baa9962863194d5e6d25ba87f53cb1))
* **react:** twelve display fields read their value typed by the record ([4c0743c](https://github.com/chelonejs/chelone/commit/4c0743ca4270d099a4db4881110d889cdb5c13b3))
* **react:** type DataTable expand panel and body props so no cast is needed ([26c7150](https://github.com/chelonejs/chelone/commit/26c715092d488efbdb8e378687e1e73ff7d78a0d))
* **react:** type the last display fields' value by the record ([21d41cc](https://github.com/chelonejs/chelone/commit/21d41ccfb0e62b34e805f5f2458ee0419f3cb548))
* **react:** useTimeout and firstFieldError take the library types they wrap ([d735e92](https://github.com/chelonejs/chelone/commit/d735e9247df3ad4a7625c3a33a542b4b8372d7f5))
* **utils,react,vue:** cutFeatures and simplifyGeo live in @chelone/utils/geo ([de3fa37](https://github.com/chelonejs/chelone/commit/de3fa37418e74371b6df7c3704935e466a5428fb))
* **utils,react,vue:** the cron helpers live in @chelone/utils/cron ([7726036](https://github.com/chelonejs/chelone/commit/77260364b3adc2795a2eb74fe90125a8cd7d7e12))
* **utils,react,vue:** the Overpass to polygon helpers live in @chelone/utils/osm ([b506d5d](https://github.com/chelonejs/chelone/commit/b506d5d61e1a53845f9bf6915a640616208d6089))
* **utils,react,vue:** unionAll and subtractMask live in @chelone/utils/osm ([722b6d5](https://github.com/chelonejs/chelone/commit/722b6d5bd55f363cf713409f952773d258d8b726))
* **vue:** choice inputs type the field and the choice values ([9698d72](https://github.com/chelonejs/chelone/commit/9698d72c8cdf92772a7e9dd8aba59e4e9fb9d418))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.7.0
    * @chelone/utils bumped to 0.7.0
  * devDependencies
    * @chelone/supabase bumped to 0.7.0
  * peerDependencies
    * @chelone/supabase bumped to 0.7.0
</details>

<details><summary>@chelone/rest: 0.7.0</summary>

## [0.7.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.6.0...@chelone/rest@0.7.0) (2026-11-06)


### Refactors

* **core,rest,supabase:** use isRecord for the last four object checks ([ae12a1a](https://github.com/chelonejs/chelone/commit/ae12a1a3c7c05b76577fbe626fe596849c193e62))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.7.0
</details>

<details><summary>@chelone/supabase: 0.7.0</summary>

## [0.7.0](https://github.com/chelonejs/chelone/compare/@chelone/supabase@0.6.0...@chelone/supabase@0.7.0) (2026-11-06)


### Features

* **supabase:** add supabaseRealtimeTransport over Supabase Realtime broadcast channels ([8a3ce6c](https://github.com/chelonejs/chelone/commit/8a3ce6cc46e2443be0a302d3552e054d16c65a02))
* **supabase:** add the chelone-supabase gen bin ([3839f63](https://github.com/chelonejs/chelone/commit/3839f63250126ec039fd9c22ae46d1781b3f7a28))


### Bug Fixes

* **core,supabase:** let getPermissions resolve undefined so the Supabase provider fits a registered AuthProvider ([038b0a5](https://github.com/chelonejs/chelone/commit/038b0a596037eeca3e99916421507ea983bf9f51))
* **supabase:** keep the gen bin's peer message and output intact ([8c51f1c](https://github.com/chelonejs/chelone/commit/8c51f1c1b26abdd5a8963d6215c6f753f82ca7fe))
* **supabase:** wait for a topic's earlier channel to be removed before opening another ([a4b81d9](https://github.com/chelonejs/chelone/commit/a4b81d943a4ba8115c69a269d24039f06e602ae8))


### Refactors

* **core,rest,supabase:** use isRecord for the last four object checks ([ae12a1a](https://github.com/chelonejs/chelone/commit/ae12a1a3c7c05b76577fbe626fe596849c193e62))
* **core,supabase:** getPermissions resolves the app's registered permissions type ([8710cd0](https://github.com/chelonejs/chelone/commit/8710cd094da169fbfd94916632032ba71e780874))
* **core,supabase:** narrow filter walks with guards instead of casts ([fd2077c](https://github.com/chelonejs/chelone/commit/fd2077cbbb4a66e2a68ebc4c416473056fd3c565))
* **core,supabase:** one isFilterBranch decides which filter values nest ([e4654d5](https://github.com/chelonejs/chelone/commit/e4654d5e729f702358a5892132f40c1d4b6b5c9d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.7.0
</details>

<details><summary>@chelone/utils: 0.7.0</summary>

## [0.7.0](https://github.com/chelonejs/chelone/compare/@chelone/utils@0.6.0...@chelone/utils@0.7.0) (2026-11-06)


### Refactors

* **utils,react,vue:** cutFeatures and simplifyGeo live in @chelone/utils/geo ([de3fa37](https://github.com/chelonejs/chelone/commit/de3fa37418e74371b6df7c3704935e466a5428fb))
* **utils,react,vue:** the cron helpers live in @chelone/utils/cron ([7726036](https://github.com/chelonejs/chelone/commit/77260364b3adc2795a2eb74fe90125a8cd7d7e12))
* **utils,react,vue:** the Overpass to polygon helpers live in @chelone/utils/osm ([b506d5d](https://github.com/chelonejs/chelone/commit/b506d5d61e1a53845f9bf6915a640616208d6089))
* **utils,react,vue:** unionAll and subtractMask live in @chelone/utils/osm ([722b6d5](https://github.com/chelonejs/chelone/commit/722b6d5bd55f363cf713409f952773d258d8b726))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.7.0
</details>

<details><summary>@chelone/vue: 0.7.0</summary>

## [0.7.0](https://github.com/chelonejs/chelone/compare/@chelone/vue@0.6.0...@chelone/vue@0.7.0) (2026-11-06)


###   BREAKING CHANGES

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
* **react,vue:** `CanAccess` takes a record with its fields ([3d61916](https://github.com/chelonejs/chelone/commit/3d619161d8b00b8636498270fbf0316e7394f064))
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
* **react,vue:** read the list filter without a cast to a string-keyed Record ([e3e69b8](https://github.com/chelonejs/chelone/commit/e3e69b84805eee287fb2f78b03a84894e2606d3e))
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
</details>

---
This PR was generated with [Release Please](https://github.com/googleapis/release-please). See [documentation](https://github.com/googleapis/release-please#release-please).