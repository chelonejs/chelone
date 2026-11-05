import { expectTypeOf, it } from "vitest";
import { getDirtyFormValues } from "./dirty-values";

interface Post {
  title: string;
  views: number;
  tags: string[];
}

const post: Post = { title: "New", views: 5, tags: ["a"] };

it("returns Partial of the form's value type", () => {
  const dirty = getDirtyFormValues(post, { title: { isDirty: true } });
  expectTypeOf(dirty).toEqualTypeOf<Partial<Post>>();
});

it("rejects a primitive as the values", () => {
  // @ts-expect-error values must be an object
  getDirtyFormValues("title", {});
});
