import { defineResources, type englishMessages } from "@chelone/core";
import { z } from "zod";
import { authorSchema } from "./authors";
import { customerSchema } from "./customers";
import { orderSchema } from "./orders";
import { placeSchema } from "./places";
import { postSchema } from "./posts";
import { productSchema } from "./products";

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

/**
 * The Zod resource registry (passed to `<Admin resources={...}>`).
 *
 * QUICKSTART: `posts` points at `postSchema` — that ALONE gives its Edit/Create
 * forms automatic validation (the D6 default validator reads the registry
 * schema and validates the form against it, no per-input `validate` props).
 * `defineResources` keeps the `"posts"` key + `typeof postSchema` literal for
 * end-to-end record-type inference. `authors`, `products`, `customers`, `orders`
 * and `places` carry their schema the same way and build their views from
 * `createResourceComponents("<name>")`, so every `source` in those demos is
 * checked against the schema.
 *
 * The schema-less entries - `api_keys`, `webhooks`, `integration_settings`,
 * `jobs` and `roles` - are `{}` entries. They fall back to the loose record type
 * and only validate what their inputs declare. Add a `schema` to any of them to
 * opt into the same auto-validation. `activity` is left out because
 * `apps/demo/src/pages/activity.tsx` owns the `/activity` route.
 */
export const resources = defineResources({
  posts: { schema: postSchema },
  authors: { schema: authorSchema },
  products: { schema: productSchema },
  customers: { schema: customerSchema },
  orders: { schema: orderSchema },
  places: { schema: placeSchema },
  pages: { schema: pageSchema },
  categories: { schema: categorySchema },
  tags: { schema: tagSchema },
  api_keys: {},
  webhooks: {},
  integration_settings: {},
  jobs: {},
  roles: {},
});

/**
 * Registering the map types every `source` prop against it. The schema-less
 * resources are `{}` entries so the plain components still accept their paths
 * (a resource with no schema has a loose record). `createResourceComponents`
 * is the strict path: see `register-proof.tsx`.
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
