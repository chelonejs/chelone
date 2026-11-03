---
'@chelone/react': patch
---

- Every field's record is typed as core's `LooseRecord`, and `FieldProps` takes it, in place of the old `unknown` aliases
- `mutate` and `mutateAsync` on an undoable are typed without a cast
- `useGetRecordRepresentationText` is exported from the barrel
- Reference choices are labelled with text rather than a `recordRepresentation` element
