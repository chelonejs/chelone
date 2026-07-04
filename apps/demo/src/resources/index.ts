import { defineResources } from "@chelone/core";
import { postSchema } from "./posts";

/**
 * The Zod resource registry (passed to `<Admin resources={...}>`).
 *
 * QUICKSTART: `posts` points at `postSchema` — that ALONE gives its Edit/Create
 * forms automatic validation (the D6 default validator reads the registry
 * schema and validates the form against it, no per-input `validate` props).
 * `defineResources` keeps the `"posts"` key + `typeof postSchema` literal for
 * end-to-end record-type inference.
 *
 * The other resources omit a schema — they fall back to the loose record type
 * and only validate what their inputs declare. Add a `schema` to any of them to
 * opt into the same auto-validation.
 */
export const resources = defineResources({
  posts: { schema: postSchema },
});
