/**
 * The zod resource registry for the Vue demo — the "point at a Zod schema"
 * quickstart, mirroring `apps/demo/src/resources/posts.tsx`. `postSchema`
 * carries the record shape AND the form validator in one place; passed to
 * `<Admin :registry>` (via `defineResources`), it becomes the DEFAULT validator
 * for the Edit/Create forms (D6): the controller reads the registry schema and
 * validates on submit — no per-field `validate` props. Zod >= 3.24 implements
 * Standard Schema, so it plugs straight into the form-core validation seam.
 *
 * Try it: open a post's Edit page, clear the Title, and submit — the schema's
 * `.min(1)` rule blocks the save and surfaces the message.
 */

import { defineResources, type englishMessages } from "@chelone/core";
import { z } from "zod";

/** The record shape + the form validator, in one place. */
export const postSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "Title is required").max(120),
  body: z.string().min(1, "Body is required"),
  author_id: z.number({ message: "Pick an author" }),
  views: z.number().min(0).optional(),
  published: z.boolean().optional(),
  status: z.enum(["draft", "in_review", "published", "rejected"]).optional(),
  /** The ids of the users who approved the post, written by `<DualApprovalButton>`. */
  approvers: z.array(z.union([z.number(), z.string()])).optional(),
  /** Unused by the forms; gives `register-proof` an array for a bracket path. */
  tags: z.array(z.object({ label: z.string() })).optional(),
});

export const authorSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional(),
});

/**
 * The schemas behind the views of `pages` and the guessed views of `categories`
 * and `tags`: a guesser builds its columns and inputs from the registered Zod
 * schema, so a resource without one shows an empty state.
 */
export const pageSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  body: z.string(),
  release_notes: z.string(),
  status: z.enum(["draft", "published"]),
  author_id: z.number(),
  parent_id: z.number().nullable(),
  updated_at: z.string(),
  published_at: z.string().nullable(),
});

export const categorySchema = z.object({
  id: z.number().optional(),
  name: z.object({ en: z.string(), pt: z.string(), fr: z.string() }),
  parent_id: z.number().nullable(),
});

export const tagSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  color: z.string(),
});

/** The registry passed to `<Admin :registry>` — the D6 default-validator seam. */
export const resources = defineResources({
  posts: { schema: postSchema },
  authors: { schema: authorSchema },
  products: {},
  customers: {},
  orders: {},
  places: {},
  pages: { schema: pageSchema },
  categories: { schema: categorySchema },
  tags: { schema: tagSchema },
});

/**
 * Registering the map types every `source` prop against it. `places` has no
 * schema, so its entry is `{}` and the plain components still accept its paths.
 * `createResourceComponents` is the strict path: see `register-proof.vue`.
 *
 * Registering `englishMessages` — the catalog `makeDemoI18n` mounts — types
 * every `useTranslate()` key and param in the app. The demos' own `demo.*` keys
 * are not in it, so they keep the loose arm with a `_` default.
 */
declare module "@chelone/core" {
  interface Register {
    resources: typeof resources;
    messages: typeof englishMessages;
  }
}

export type Resources = typeof resources;
