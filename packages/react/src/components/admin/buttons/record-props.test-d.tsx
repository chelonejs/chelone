import { describe, expectTypeOf, it } from "vitest";
import { CloneButton } from "./clone-button";
import { DeleteButton } from "./delete-button";
import { EditButton } from "./edit-button";
import { ShowButton } from "./show-button";

interface Post {
  id: number;
  title: string;
}

declare const post: Post;

describe("record buttons", () => {
  it("a button takes a record typed by an interface", () => {
    expectTypeOf(<EditButton record={post} />).not.toBeAny();
    expectTypeOf(<ShowButton record={post} />).not.toBeAny();
    expectTypeOf(<CloneButton record={post} />).not.toBeAny();
    expectTypeOf(<DeleteButton record={post} />).not.toBeAny();
  });

  it("a button rejects a record with no id", () => {
    // @ts-expect-error a record has an id
    <EditButton record={{ title: "x" }} />;
    // @ts-expect-error a record has an id
    <ShowButton record={{ title: "x" }} />;
    // @ts-expect-error a record has an id
    <CloneButton record={{ title: "x" }} />;
    // @ts-expect-error a record has an id
    <DeleteButton record={{ title: "x" }} />;
  });
});
