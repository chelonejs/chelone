# @chelone/core

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
