# @chelone/rest

## [0.4.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.3.0...@chelone/rest@0.4.0) (2026-11-04)


### Chores

* **@chelone/rest:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.4.0

## [0.3.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.2.0...@chelone/rest@0.3.0) (2026-11-04)


### Chores

* **@chelone/rest:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.3.0

## [0.2.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.1.1...@chelone/rest@0.2.0) (2026-11-03)


### Chores

* **@chelone/rest:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.2.0

## 0.1.1

### Patch Changes

- `restDataProvider` covers every verb: the five single-record ones, `getMany`, `getManyReference`, `updateMany` and `deleteMany`
- A 422 with field errors rejects with `ValidationError`; one with no field message stays an `HttpError`
- `getMany` with no ids resolves empty without a request
- Record bodies, filter key collisions and missing totals are read defensively
- Updated dependencies [86ac54c]
  - @chelone/core@0.1.1
