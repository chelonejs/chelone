/**
 * The authors demo's typed components, checked by `tsc` (`pnpm typecheck`) and
 * never run. Each `@ts-expect-error` must stay an error, or the typecheck fails
 * on the unused directive: that is what pins a wrong `source` as a compile
 * error. `register-proof.tsx` covers the same path for `posts`; this file
 * covers it for `authors`.
 */
import type { RecordOf } from "@chelone/core";
import { createResourceComponents } from "@chelone/react";
import { expectTypeOf } from "vitest";
import { authorSchema } from "./authors";
import { resources } from "./index";

const authors = createResourceComponents("authors");

/** The registered record is the schema's output, not a loose record. */
expectTypeOf<RecordOf<typeof resources, "authors">>().toEqualTypeOf<{
  id?: number;
  name: string;
  email: string;
}>();

/** The registry carries the schema itself, so the forms validate against it. */
expectTypeOf(resources.authors.schema).toEqualTypeOf(authorSchema);

export function AuthorSourceProof() {
  return (
    <>
      {/* both paths of the authors schema pass */}
      <authors.TextInput source="name" />
      <authors.EmailField source="email" />
      <authors.RecordField source="name" />

      {/* a typo */}
      {/* @ts-expect-error `nickname` is no path of an author */}
      <authors.TextInput source="nickname" />

      {/* a path that only posts has */}
      {/* @ts-expect-error `title` belongs to posts, not authors */}
      <authors.TextInput source="title" />
    </>
  );
}
