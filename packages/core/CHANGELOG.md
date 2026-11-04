# @chelone/core

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
