import { defineResources, type Identifier } from "@chelone/core";
import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  useDelete,
  useDeleteMany,
  useUpdate,
  useUpdateMany,
} from "./mutations";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), draft: z.boolean() }),
  },
});
type R = typeof resources;
type Post = { id: number; title: string; draft: boolean };

const undoable = { mutationMode: "undoable" } as const;
const previousData: Post = { id: 1, title: "y", draft: false };

// Type-only: the bodies below are checked, never run. The single-record
// composables resolve the record when pessimistic; the bulk pair resolve the
// affected ids, so those are pinned as `Identifier[] | void`.
it("an undoable useUpdate, useDelete, useDeleteMany and useUpdateMany type mutateAsync as the record or nothing", async () => {
  const update = useUpdate<R, "posts">("posts", undoable);
  const del = useDelete<R, "posts">("posts", undoable);
  const deleteMany = useDeleteMany<R, "posts">("posts", undoable);
  const updateMany = useUpdateMany<R, "posts">("posts", undoable);

  const updated = await update.mutateAsync({
    id: 1,
    data: { title: "x" },
    previousData,
  });
  expectTypeOf(updated).toEqualTypeOf<Post | void>();
  // @ts-expect-error an undoable mutateAsync may resolve nothing
  const updatedPost: Post = updated;

  const deleted = await del.mutateAsync({ id: 1, previousData });
  expectTypeOf(deleted).toEqualTypeOf<Post | void>();
  // @ts-expect-error an undoable mutateAsync may resolve nothing
  const deletedPost: Post = deleted;

  const deletedIds = await deleteMany.mutateAsync({ ids: [1] });
  expectTypeOf(deletedIds).toEqualTypeOf<Identifier[] | void>();
  // @ts-expect-error an undoable mutateAsync may resolve nothing
  const deletedIdList: Identifier[] = deletedIds;

  const updatedIds = await updateMany.mutateAsync({
    ids: [1],
    data: { title: "x" },
  });
  expectTypeOf(updatedIds).toEqualTypeOf<Identifier[] | void>();
  // @ts-expect-error an undoable mutateAsync may resolve nothing
  const updatedIdList: Identifier[] = updatedIds;

  void [updatedPost, deletedPost, deletedIdList, updatedIdList];
});

it("mutate still takes an onSuccess option", () => {
  const update = useUpdate<R, "posts">("posts", undoable);
  update.mutate(
    { id: 1, data: { title: "x" }, previousData },
    { onSuccess: () => {} },
  );
  const del = useDelete<R, "posts">("posts");
  del.mutate({ id: 1, previousData }, { onSuccess: () => {} });
});

it("an undoable useUpdate and useUpdateMany patch is the named resource's Partial", () => {
  const update = useUpdate<R, "posts">("posts", undoable);
  const updateMany = useUpdateMany<R, "posts">("posts", undoable);
  expectTypeOf<Parameters<typeof update.mutate>[0]["data"]>().toEqualTypeOf<
    Partial<Post>
  >();
  update.mutate({
    id: 1,
    // @ts-expect-error title is a string
    data: { title: 1 },
    previousData,
  });
  // @ts-expect-error title is a string
  updateMany.mutate({ ids: [1], data: { title: 1 } });
});

// A kanban move plan is `{ id, data: Record<string, string>, previousData }`,
// built without knowing the resource, so it must fit `mutateAsync` in either
// mode through the default resource map.
it("useUpdate mutateAsync accepts a plan-shaped { id, data, previousData } in both modes", () => {
  const plan = {
    id: 1,
    data: { draft: "done" } satisfies Record<string, string>,
    previousData,
  };
  const pessimistic = useUpdate("posts");
  const optimistic = useUpdate("posts", { mutationMode: "optimistic" });
  const undo = useUpdate("posts", undoable);
  void [
    pessimistic.mutateAsync(plan),
    optimistic.mutateAsync(plan),
    undo.mutateAsync(plan),
  ];
});
