# @chelone/react

## 0.1.1

### Patch Changes

- 86ac54c: - Every field's record is typed as core's `LooseRecord`, and `FieldProps` takes it, in place of the old `unknown` aliases
  - `mutate` and `mutateAsync` on an undoable are typed without a cast
  - `useGetRecordRepresentationText` is exported from the barrel
  - Reference choices are labelled with text rather than a `recordRepresentation` element
- 86ac54c: - An undoable mutate runs the `onSuccess`, `onError` and `onSettled` it is given, with the setup shared in core
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
