/**
 * The two resources this app routes by hand. `posts` points at a Zod schema, as
 * in `apps/demo`, so its `Edit` form validates from the registry; `comments`
 * carries no schema.
 *
 * The mix is load-bearing, not a shortcut: `AnySourcePath` — what every
 * `source` prop falls back to for a loose record — is `string` only while some
 * registered resource has no schema. Register a schema for EVERY resource and
 * it narrows to a literal union, and `@chelone/react`'s own generic components
 * (which pass a deferred `SourceProp` into that fallback) stop typechecking.
 */

import { defineResources } from "@chelone/core";
import { z } from "zod";

export const postSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  body: z.string(),
  author_id: z.number(),
  views: z.number(),
  published: z.boolean(),
  status: z.enum(["draft", "in_review", "published"]),
});

export const resources = defineResources({
  posts: { schema: postSchema },
  comments: {},
});

/** The registry this app registers, for typing the data providers. */
export type NextDemoResources = typeof resources;

declare module "@chelone/core" {
  interface Register {
    resources: typeof resources;
  }
}
