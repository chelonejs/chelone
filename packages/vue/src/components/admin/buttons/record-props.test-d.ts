import { assertType, describe, it } from "vitest";
import type { CloneButtonProps } from "./clone-button.vue";
import type { DeleteButtonProps } from "./delete-button.vue";
import type { EditButtonProps } from "./edit-button.vue";
import type { ShowButtonProps } from "./show-button.vue";

interface Post {
  id: number;
  title: string;
}

describe("record buttons", () => {
  it("a button takes a record typed by an interface", () => {
    const post: Post = { id: 1, title: "x" };
    assertType<EditButtonProps<Post>>({ record: post });
    assertType<ShowButtonProps<Post>>({ record: post });
    assertType<CloneButtonProps<Post>>({ record: post });
    assertType<DeleteButtonProps<Post>>({ record: post });
  });

  it("a button rejects a record with no id", () => {
    // @ts-expect-error a record has an id
    assertType<EditButtonProps>({ record: { title: "x" } });
    // @ts-expect-error a record has an id
    assertType<ShowButtonProps>({ record: { title: "x" } });
    // @ts-expect-error a record has an id
    assertType<CloneButtonProps>({ record: { title: "x" } });
    // @ts-expect-error a record has an id
    assertType<DeleteButtonProps>({ record: { title: "x" } });
  });
});
