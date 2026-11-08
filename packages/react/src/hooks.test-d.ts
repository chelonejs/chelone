import { defineResources } from "@chelone/core";
import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { UsePermissionsResult } from "./auth-hooks";
import { useDelete, useUpdate } from "./hooks";
import { useTranslate } from "./i18n-hooks";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type R = typeof resources;
type Post = { id: number; title: string };

// Type-only: the bodies below are checked, never run.
it("an undoable useUpdate and useDelete type mutateAsync as the record or nothing", async () => {
  const update = useUpdate<R, "posts">("posts", { mutationMode: "undoable" });
  const del = useDelete<R, "posts">("posts", { mutationMode: "undoable" });

  const updated = await update.mutateAsync({
    id: 1,
    data: { title: "x" },
    previousData: { id: 1, title: "y" },
  });
  expectTypeOf(updated).toEqualTypeOf<Post | void>();
  // @ts-expect-error an undoable mutateAsync may resolve nothing
  const updatedPost: Post = updated;

  const deleted = await del.mutateAsync({
    id: 1,
    previousData: { id: 1, title: "y" },
  });
  expectTypeOf(deleted).toEqualTypeOf<Post | void>();
  // @ts-expect-error an undoable mutateAsync may resolve nothing
  const deletedPost: Post = deleted;

  void [updatedPost, deletedPost];
});

it("mutate still takes an onSuccess option on the update and delete results", () => {
  const update = useUpdate<R, "posts">("posts", { mutationMode: "undoable" });
  update.mutate(
    { id: 1, data: { title: "x" }, previousData: { id: 1, title: "y" } },
    { onSuccess: () => {} },
  );
  const del = useDelete<R, "posts">("posts");
  del.mutate(
    { id: 1, previousData: { id: 1, title: "y" } },
    { onSuccess: () => {} },
  );
});

it("an undoable useUpdate patch is the named resource's Partial", () => {
  const update = useUpdate<R, "posts">("posts", { mutationMode: "undoable" });
  type Params = Parameters<typeof update.mutate>[0];
  expectTypeOf<Params["data"]>().toEqualTypeOf<Partial<Post>>();
  update.mutate({
    id: 1,
    // @ts-expect-error title is a string
    data: { title: 1 },
    previousData: { id: 1, title: "y" },
  });
});

it("translate params refuse an object value", () => {
  const translate = useTranslate();
  translate("k", { x: 1, y: "two" });
  // @ts-expect-error a message param is a string or a number
  translate("k", { x: {} });
});

it("permissions error is Error or null", () => {
  expectTypeOf<UsePermissionsResult["error"]>().toEqualTypeOf<Error | null>();
});
