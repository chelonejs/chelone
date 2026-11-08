# @chelone/supabase

## [0.11.0](https://github.com/chelonejs/chelone/compare/@chelone/supabase@0.10.0...@chelone/supabase@0.11.0) (2026-11-08)


### Features

* **core:** make SortPayload generic over the record ([730bf78](https://github.com/chelonejs/chelone/commit/730bf7849537b4ff83f6a70d6b6477097997bb13))
* **supabase:** type primary keys by resource records ([e814699](https://github.com/chelonejs/chelone/commit/e81469900b6c72658472b55bb1b87ac8a27769ec))


### Bug Fixes

* **core:** type a field descriptor's source as the registry-wide path ([36e722c](https://github.com/chelonejs/chelone/commit/36e722c6cb5b6ba3872f93b0d8e7ff817dc77694))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.11.0

## [0.10.0](https://github.com/chelonejs/chelone/compare/@chelone/supabase@0.9.0...@chelone/supabase@0.10.0) (2026-11-07)


### Chores

* **@chelone/supabase:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.10.0

## [0.9.0](https://github.com/chelonejs/chelone/compare/@chelone/supabase@0.8.0...@chelone/supabase@0.9.0) (2026-11-07)


### Chores

* **@chelone/supabase:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.9.0

## [0.8.0](https://github.com/chelonejs/chelone/compare/@chelone/supabase@0.7.0...@chelone/supabase@0.8.0) (2026-11-07)


### Refactors

* **supabase,rest:** narrow a data provider's meta once, in a guard ([e0631b4](https://github.com/chelonejs/chelone/commit/e0631b4dba40f5aff746ba8daa9302541423a8b7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.8.0

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

## [0.6.0](https://github.com/chelonejs/chelone/compare/@chelone/supabase@0.5.0...@chelone/supabase@0.6.0) (2026-11-04)


### Features

* **supabase:** read a Database type and write a defineResources file ([0b0b9a2](https://github.com/chelonejs/chelone/commit/0b0b9a28b837ca9658fc799a2379acf38e1f0b77))
* **supabase:** supabaseLockProvider keeps record locks in a Supabase table ([4902add](https://github.com/chelonejs/chelone/commit/4902add3bb704bb8043559ca47ccb9d4d2dcaa6a))


### Bug Fixes

* **supabase:** write a reference column once in the resources file ([892de22](https://github.com/chelonejs/chelone/commit/892de22eb3cc61b59c63f34dda8483669987c53f))


### Refactors

* **rest,supabase:** return records from the providers without as never ([9635d7b](https://github.com/chelonejs/chelone/commit/9635d7bf4b317552f02aed5d52dc390e0c96be2c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.6.0

## [0.5.0](https://github.com/chelonejs/chelone/compare/@chelone/supabase@0.4.0...@chelone/supabase@0.5.0) (2026-11-04)


### Chores

* **@chelone/supabase:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.5.0

## [0.4.0](https://github.com/chelonejs/chelone/compare/@chelone/supabase@0.3.0...@chelone/supabase@0.4.0) (2026-11-04)


### Chores

* **@chelone/supabase:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.4.0

## [0.3.0](https://github.com/chelonejs/chelone/compare/@chelone/supabase@0.2.0...@chelone/supabase@0.3.0) (2026-11-04)


### Chores

* **@chelone/supabase:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.3.0

## [0.2.0](https://github.com/chelonejs/chelone/compare/@chelone/supabase@0.1.1...@chelone/supabase@0.2.0) (2026-11-03)


### Chores

* **@chelone/supabase:** Synchronize chelone versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @chelone/core bumped to 0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [86ac54c]
  - @chelone/core@0.1.1

## 0.1.0

### Minor Changes

- 7d585f2: First release.

### Patch Changes

- Updated dependencies [7d585f2]
  - @chelone/core@0.1.0
