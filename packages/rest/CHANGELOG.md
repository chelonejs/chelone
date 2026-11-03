# @chelone/rest

## 0.1.1

### Patch Changes

- `restDataProvider` covers every verb: the five single-record ones, `getMany`, `getManyReference`, `updateMany` and `deleteMany`
- A 422 with field errors rejects with `ValidationError`; one with no field message stays an `HttpError`
- `getMany` with no ids resolves empty without a request
- Record bodies, filter key collisions and missing totals are read defensively
- Updated dependencies [86ac54c]
  - @chelone/core@0.1.1
