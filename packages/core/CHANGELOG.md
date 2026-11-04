# @chelone/core

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
