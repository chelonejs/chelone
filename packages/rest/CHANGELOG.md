# @chelone/rest

## [0.13.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.12.0...@chelone/rest@0.13.0) (2026-11-10)


### Chores

* **@chelone/rest:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.13.0

## [0.12.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.11.0...@chelone/rest@0.12.0) (2026-11-09)


### Chores

* **@chelone/rest:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.12.0

## [0.11.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.10.0...@chelone/rest@0.11.0) (2026-11-08)


### Chores

* **@chelone/rest:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.11.0

## [0.10.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.9.0...@chelone/rest@0.10.0) (2026-11-07)


### Chores

* **@chelone/rest:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.10.0

## [0.9.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.8.0...@chelone/rest@0.9.0) (2026-11-07)


### Chores

* **@chelone/rest:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.9.0

## [0.8.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.7.0...@chelone/rest@0.8.0) (2026-11-07)


### Refactors

* **supabase,rest:** narrow a data provider's meta once, in a guard ([e0631b4](https://github.com/chelonejs/chelone/commit/e0631b4dba40f5aff746ba8daa9302541423a8b7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.8.0

## [0.7.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.6.0...@chelone/rest@0.7.0) (2026-11-06)


### Refactors

* **core,rest,supabase:** use isRecord for the last four object checks ([ae12a1a](https://github.com/chelonejs/chelone/commit/ae12a1a3c7c05b76577fbe626fe596849c193e62))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.7.0

## [0.6.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.5.0...@chelone/rest@0.6.0) (2026-11-04)


### Refactors

* **rest,supabase:** return records from the providers without as never ([9635d7b](https://github.com/chelonejs/chelone/commit/9635d7bf4b317552f02aed5d52dc390e0c96be2c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.6.0

## [0.5.0](https://github.com/chelonejs/chelone/compare/@chelone/rest@0.4.0...@chelone/rest@0.5.0) (2026-11-04)


### Chores

* **@chelone/rest:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.5.0

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
