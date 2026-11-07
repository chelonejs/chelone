# @chelone/react

## [0.9.0](https://github.com/chelonejs/chelone/compare/@chelone/react@0.8.0...@chelone/react@0.9.0) (2026-11-07)


### Features

* **charts:** cycle the theme chart colors over BarChart bars ([dfb48da](https://github.com/chelonejs/chelone/commit/dfb48daf3ce496d3e3a57eefd7205a4d89159379))
* **command-menu:** one centred dialog on every screen size ([2c50c67](https://github.com/chelonejs/chelone/commit/2c50c674ef179f8d03a7b35e8a00c85e59fa403b))
* **react:** add brandHref to AppSidebar ([4041258](https://github.com/chelonejs/chelone/commit/4041258fb610c231c2c837823dfdccd7afee84b0))
* **vue:** add brandHref and a #brand slot to AppSidebar, drop the demos' sidebar copies ([ef97d37](https://github.com/chelonejs/chelone/commit/ef97d37e0591c4c18fd36f64c33808be389da175))


### Bug Fixes

* **charts:** paint every donut slice with its own fill ([44648d5](https://github.com/chelonejs/chelone/commit/44648d5d11999e2e78c2c687ed926ccdcd66bd3d))
* darken the light-mode sidebar accent so the selected item shows ([e3a4783](https://github.com/chelonejs/chelone/commit/e3a4783c70f12b0098816ac8c44455bb733c8af3))
* **list:** give ListPagination a default top margin in both adapters ([6c192ee](https://github.com/chelonejs/chelone/commit/6c192eeca3f3a7830534ed70b68c8942a4e5978f))
* **react:** anchor the geocoding results as a combobox overlay ([f448be8](https://github.com/chelonejs/chelone/commit/f448be82471e7f2a156607c60093f40febbf06b3))
* **react:** land ArrowUp on the last option when nothing is highlighted ([7332784](https://github.com/chelonejs/chelone/commit/733278491ac79e50ba02a0ae79330e2c888de408))
* round table borders in calendar views and docs prose tables ([fa75a7f](https://github.com/chelonejs/chelone/commit/fa75a7fcf327bb00f1c1ed2ee88d78db6b7f7159))
* **sidebar:** centre the icons and clear the app bar when collapsed ([458efc6](https://github.com/chelonejs/chelone/commit/458efc6ad0675777a917a6ce98a4133b6eaf9adb))
* **sidebar:** keep a one-line menu row at its 2rem height ([fc3e9a8](https://github.com/chelonejs/chelone/commit/fc3e9a881c791eccc515745ddcd295f03d70e8e0))
* **sidebar:** let the menu button height grow with a wrapped label ([b79ecd8](https://github.com/chelonejs/chelone/commit/b79ecd86ca19d2f3dd3257b19039682f00848bea))
* **sidebar:** size the in-flow gap and the app column from the same vars as the panel ([9d1a071](https://github.com/chelonejs/chelone/commit/9d1a0717a9ce569a5acfbbcd198bca4ec614f378))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.9.0
    * @chelone/utils bumped to 0.9.0
  * devDependencies
    * @chelone/supabase bumped to 0.9.0
  * peerDependencies
    * @chelone/supabase bumped to 0.9.0

## [0.8.0](https://github.com/chelonejs/chelone/compare/@chelone/react@0.7.0...@chelone/react@0.8.0) (2026-11-07)


### Features

* **demo:** a status page shows every loading, empty and error state ([cc3eb7f](https://github.com/chelonejs/chelone/commit/cc3eb7f942c76868ed2eada910adc689dc453c54))
* **demo:** both demos show every value input and the showcase entries are filled ([f23fc3b](https://github.com/chelonejs/chelone/commit/f23fc3b430252a1065c9b6b3aac203e5fb74962f))
* **demo:** posts go through review, approval and comments ([dae3e0e](https://github.com/chelonejs/chelone/commit/dae3e0e60d44941d0bbbb326119a02773c76fb14))
* **demo:** product variants use the array inputs ([1bd5a0c](https://github.com/chelonejs/chelone/commit/1bd5a0c026a44663284fd63e02269e6469f4348a))
* **demo:** the customer pages show plans, usage and contact details ([7cd38b0](https://github.com/chelonejs/chelone/commit/7cd38b0391dd2d28c27c96afcbe1d017fcd1ced4))
* **demo:** the product form uses the value inputs ([7eef8d8](https://github.com/chelonejs/chelone/commit/7eef8d8d05a580f06102819d9bd84249913285eb))
* **demo:** the realtime components are in the showcase ([c832774](https://github.com/chelonejs/chelone/commit/c832774488c6df2c36e0869b691d04c946395f63))
* **demo:** the Vue customer list uses the bulk actions and CSV import ([0555bd3](https://github.com/chelonejs/chelone/commit/0555bd30463a576e5f3ca0bc6e81add5a0a8cf40))
* **demo:** the Vue demo has products ([68e4753](https://github.com/chelonejs/chelone/commit/68e47532d8da11d4f2eb021c1b8360a6b6598a08))
* **demo:** use every filter and sort control in the product list ([b6d5195](https://github.com/chelonejs/chelone/commit/b6d51951c2d83d5867fc2dc82b6392aec63eff40))
* **vue-demo:** customers and orders views matching the React demo ([4dba35d](https://github.com/chelonejs/chelone/commit/4dba35d16638f60022fb78992f91ae91a70bc928))


### Bug Fixes

* a bulk update keeps its own label and the fake provider returns copies ([914f023](https://github.com/chelonejs/chelone/commit/914f0234bdf0e72920537575adc510043317d886))
* **calendar:** a selected day has the same range in both adapters ([6207063](https://github.com/chelonejs/chelone/commit/6207063f8cf3c39d903950dea0c43de1551ff287))
* centre the password toggle and open up the auth subtitle ([994426b](https://github.com/chelonejs/chelone/commit/994426b9560ced061de216bff57da005e7fa22ff))
* centre the password toggle, settle Monaco's auto-height, mark the React cron field ([f3502be](https://github.com/chelonejs/chelone/commit/f3502be5d6642da5664336110251d9dab14dd217))
* **core:** an image preview shows a stored raster data URL ([77967d1](https://github.com/chelonejs/chelone/commit/77967d19405ae7dc37d1654517c7ed29e4bc4b4d))
* **demo:** pages sit inside their menu group and the page scrolls under the app bar ([e3593f0](https://github.com/chelonejs/chelone/commit/e3593f0d514cc5dc6f0c95e56d0a1ce18319a4cd))
* **devtools:** scroll the entry list inside the panel ([2e2200f](https://github.com/chelonejs/chelone/commit/2e2200f74a02dab9b765a3484463716217e085ed))
* **docs:** align React's Add filter menu and make live search narrow ([3540655](https://github.com/chelonejs/chelone/commit/3540655f837b796705e47cf161868f132ca9c79f))
* duration input values are not muted, and Vue date and time pickers match React ([9dbad84](https://github.com/chelonejs/chelone/commit/9dbad8453ea8e33b56cf4831d1f57048c521e98e))
* **i18n:** write fallback copy with core's placeholder ([a01e90a](https://github.com/chelonejs/chelone/commit/a01e90a374adb1457eec26b008029560dcb6a535))
* **list:** keep the data-table sort button inside its header cell ([63ba6bb](https://github.com/chelonejs/chelone/commit/63ba6bbaec30fbbe3cfe3bfdd4c4a0cf157b8b9e))
* **mdx-editor:** style dark theme and content to match the admin in both adapters ([854239b](https://github.com/chelonejs/chelone/commit/854239bb6044c785a99316573e100ecf88f80243))
* **react,vue:** centre the loading spinner, fit the error accordion, flex the update prompt ([8c47844](https://github.com/chelonejs/chelone/commit/8c4784408e96b9e794ff2f3e5c30784bf4f72398))
* **react,vue:** delete confirm, theme key and command menu defaults match across adapters ([a294fb1](https://github.com/chelonejs/chelone/commit/a294fb128d25567c7d07cbcff9b9fc823e72e2cd))
* **react,vue:** the clear button lines up with its input ([7c272b8](https://github.com/chelonejs/chelone/commit/7c272b89f4e182912bf68a7dd05218aa70c0ed18))
* **react:** CanAccess is generic over its record so inline records still fit ([b125221](https://github.com/chelonejs/chelone/commit/b125221b0853fe859d3fc8361dd811c5fe5aa297))
* **react:** dark MDX palette reaches the editor popups again ([b39458d](https://github.com/chelonejs/chelone/commit/b39458dc85178f2962efcc160da788709b471f32))
* **react:** inline SimpleFormIterator children share the row ([87cdd0d](https://github.com/chelonejs/chelone/commit/87cdd0d5e32d617a7616fc13ee13134370fd1d9e))
* **react:** keep the clear button for a multiline resettable input ([e2413db](https://github.com/chelonejs/chelone/commit/e2413db8e82ce9e2f085a86e00ed282a07f0c037))
* **react:** render no-layout custom routes outside the Layout when signed in ([35f9c65](https://github.com/chelonejs/chelone/commit/35f9c659587184b5639c7b8c0e4d87f3b16a33df))
* readable webhook status in dark mode, pagination on the keys table ([7c10a31](https://github.com/chelonejs/chelone/commit/7c10a316f0b65f512481858ffb67761e8f6795e4))
* **views:** space the fields of Show, Create and Edit in both adapters ([ee19519](https://github.com/chelonejs/chelone/commit/ee19519fd02ddc03220ddf64a7a6b13ab10238a9))


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
* **react:** search-input and ResettableTextInput share the clear wiring ([ae8f53a](https://github.com/chelonejs/chelone/commit/ae8f53ae6507c3af3694a347378dc655c3202f7f))
* useInput has one signature in both adapters ([df268de](https://github.com/chelonejs/chelone/commit/df268de2dce54b1e11177587ff7f68e1908b5cea))
* useInput has one signature in both adapters ([b7953e7](https://github.com/chelonejs/chelone/commit/b7953e7369f84ef6f4256d0826ba0d7822d7f4f3))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.8.0
    * @chelone/utils bumped to 0.8.0
  * devDependencies
    * @chelone/supabase bumped to 0.8.0
  * peerDependencies
    * @chelone/supabase bumped to 0.8.0

## [0.7.0](https://github.com/chelonejs/chelone/compare/@chelone/react@0.6.0...@chelone/react@0.7.0) (2026-11-06)


### ⚠ BREAKING CHANGES

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
* **react,vue:** &lt;CanAccess&gt; takes a record with its fields ([3d61916](https://github.com/chelonejs/chelone/commit/3d619161d8b00b8636498270fbf0316e7394f064))
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

## [0.6.0](https://github.com/chelonejs/chelone/compare/@chelone/react@0.5.0...@chelone/react@0.6.0) (2026-11-04)


### ⚠ BREAKING CHANGES

* **react:** KanbanBoard and KanbanBoardProps are no longer exported from @chelone/react. Import them from @chelone/react/kanban and install @dnd-kit/react and @dnd-kit/dom.

### Features

* **core:** toTimelineEntries reads timeline entries from records, formatRelativeTime moves to core ([b381402](https://github.com/chelonejs/chelone/commit/b3814020784ecd2ddb543da95110dc581e5b14c5))
* **react,vue:** useGetList takes a refetchInterval ([9ae8cda](https://github.com/chelonejs/chelone/commit/9ae8cdaa4ae4d5685f189cb7ebf3d691396762a0))
* **react:** drag KanbanBoard cards with @dnd-kit/react ([6181c69](https://github.com/chelonejs/chelone/commit/6181c69d0afa7b6deadd0726ab06dce6a7f10c0c))
* **react:** PivotGrid shows the records of a list as a pivot table with totals ([6bece1f](https://github.com/chelonejs/chelone/commit/6bece1f0961e9bba868b070bbbefba7073a74898))


### Bug Fixes

* **react:** keep a kanban card's button semantics under dnd-kit ([c6c7622](https://github.com/chelonejs/chelone/commit/c6c76229c0884d95b9d7d23d37e55add0016f6dc))
* **react:** remove the type escapes the kanban move added ([5c2a92a](https://github.com/chelonejs/chelone/commit/5c2a92a7fbed1eb9cc3afa835155f1fb649e83bc))


### Refactors

* **react:** choice inputs keep TChoice through their body ([ecda42c](https://github.com/chelonejs/chelone/commit/ecda42c5212cbf2a2ed4344c88cac53d5e8049bf))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.6.0
  * devDependencies
    * @chelone/supabase bumped to 0.6.0
  * peerDependencies
    * @chelone/supabase bumped to 0.6.0

## [0.5.0](https://github.com/chelonejs/chelone/compare/@chelone/react@0.4.0...@chelone/react@0.5.0) (2026-11-04)


### Features

* **react:** a resource component's format, parse and transform take the value at its source ([f45e8ce](https://github.com/chelonejs/chelone/commit/f45e8ceb6708f99aca9758594a624ce11524cf8f))


### Bug Fixes

* **react,vue:** type the Vue DatagridInput choice paths by its choices too ([6c34ecb](https://github.com/chelonejs/chelone/commit/6c34ecb4d89477686f9673259be35a5462390f1c))
* **react:** take the guessers as Resource list, edit and show views ([6e0e6df](https://github.com/chelonejs/chelone/commit/6e0e6dfc46c97090ce4a4992f1b5959a40f8a383))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.5.0
  * devDependencies
    * @chelone/supabase bumped to 0.5.0
  * peerDependencies
    * @chelone/supabase bumped to 0.5.0

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
