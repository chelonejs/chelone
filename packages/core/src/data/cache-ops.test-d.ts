import type { QueryClient } from "@tanstack/query-core";
import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { defineResources } from "../resource/registry";
import {
  patchListEntries,
  type patchManyEntries,
  removeRecordsFromCache,
  updateRecordsInCache,
} from "./cache-ops";
import { undoableUpdateOptions } from "./undoable";

const resources = defineResources({
  posts: {
    schema: z.object({
      id: z.number(),
      title: z.string(),
      views: z.number().optional(),
    }),
  },
  comments: { schema: z.object({ id: z.number(), body: z.string() }) },
});
type Resources = typeof resources;
type Post = { id: number; title: string; views?: number | undefined };

declare const queryClient: QueryClient;

describe("cache ops are typed by the named resource's record", () => {
  it("updateRecordsInCache takes the named record's Partial as its patch and rejects a mistyped field", () => {
    type Data = Parameters<typeof updateRecordsInCache<Resources, "posts">>[3];
    expectTypeOf<Data>().toEqualTypeOf<Partial<Post>>();

    updateRecordsInCache<Resources, "posts">(queryClient, "posts", [1], {
      title: "x",
    });
    updateRecordsInCache<Resources, "posts">(queryClient, "posts", [1], {
      // @ts-expect-error title is a string
      title: 1,
    });
    updateRecordsInCache<Resources, "posts">(queryClient, "posts", [1], {
      // @ts-expect-error unknown field
      nope: 1,
    });
  });

  it("a patch that names a field of another resource fails", () => {
    updateRecordsInCache<Resources, "comments">(queryClient, "comments", [1], {
      body: "x",
    });
    updateRecordsInCache<Resources, "comments">(queryClient, "comments", [1], {
      // @ts-expect-error title belongs to posts, not comments
      title: "x",
    });
  });

  it("a name outside TResources fails", () => {
    // @ts-expect-error "tags" is not a resource of Resources
    updateRecordsInCache<Resources, "tags">(queryClient, "tags", [1], {});
    // @ts-expect-error the resource argument is the TName given
    updateRecordsInCache<Resources, "posts">(queryClient, "comments", [1], {});
  });

  it("a call with no type arguments takes a loose patch", () => {
    updateRecordsInCache(queryClient, "posts", [1], { title: "x", any: 1 });
    removeRecordsFromCache(queryClient, "posts", [1]);
  });

  it("patchListEntries and patchManyEntries take the named record's Partial too", () => {
    expectTypeOf<
      Parameters<typeof patchListEntries<Resources, "posts">>[3]
    >().toEqualTypeOf<Partial<Post>>();
    expectTypeOf<
      Parameters<typeof patchManyEntries<Resources, "posts">>[3]
    >().toEqualTypeOf<Partial<Post>>();
    patchListEntries<Resources, "posts">(queryClient, "posts", new Set(["1"]), {
      // @ts-expect-error title is a string
      title: 1,
    });
  });

  it("undoableUpdateOptions ties its patch to the named resource", () => {
    undoableUpdateOptions<Resources, "posts">(queryClient, "posts", [1], {
      title: "x",
    });
    undoableUpdateOptions<Resources, "posts">(queryClient, "posts", [1], {
      // @ts-expect-error title is a string
      title: 1,
    });
    // @ts-expect-error "tags" is not a resource of Resources
    undoableUpdateOptions<Resources, "tags">(queryClient, "tags", [1], {});
  });

  it("removeRecordsFromCache takes a name of TResources", () => {
    removeRecordsFromCache<Resources, "posts">(queryClient, "posts", [1]);
    // @ts-expect-error "tags" is not a resource of Resources
    removeRecordsFromCache<Resources, "tags">(queryClient, "tags", [1]);
    // @ts-expect-error the resource argument is the TName given
    removeRecordsFromCache<Resources, "posts">(queryClient, "comments", [1]);
  });
});
