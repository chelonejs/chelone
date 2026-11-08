import { describe, expectTypeOf, it } from "vitest";
import type { LooseRecord } from "../resource/record";
import {
  type InPlaceEditorEvent,
  type InPlaceEditorState,
  nextInPlaceEditorState,
  planInPlaceSave,
} from "./in-place-editor";

interface Post {
  id: number;
  title: string;
}

declare const post: Post;
declare const state: InPlaceEditorState<Post>;
declare const other: InPlaceEditorState<{ id: number; name: string }>;

describe("in-place editor types", () => {
  it("a save plan keeps the record's own type", () => {
    const plan = planInPlaceSave(post, { title: "new" });
    expectTypeOf(plan).toEqualTypeOf<{
      id: number;
      data: Partial<Post>;
      previousData: Post;
      preview: Post;
    } | null>();
  });

  it("dirty fields cannot widen the record type", () => {
    // @ts-expect-error "titel" is not a field of Post
    planInPlaceSave(post, { titel: "new" });
    // @ts-expect-error extra dirty fields cannot be inferred into Post
    planInPlaceSave(post, { title: "new", extra: true });
    // @ts-expect-error the dirty title must have Post's value type
    planInPlaceSave(post, { title: 42 });
  });

  it("the saving state holds a preview of the record's type", () => {
    expectTypeOf<InPlaceEditorState<Post>>().toEqualTypeOf<
      | { status: "reading" }
      | { status: "editing" }
      | { status: "saving"; preview: Post }
    >();
    expectTypeOf<
      Extract<InPlaceEditorEvent<Post>, { type: "save" }>["preview"]
    >().toEqualTypeOf<Post>();
    expectTypeOf(
      nextInPlaceEditorState(state, { type: "cancel" }),
    ).toEqualTypeOf<InPlaceEditorState<Post>>();
  });

  it("a state for one record is not a state for another", () => {
    // @ts-expect-error the preview is not a Post
    nextInPlaceEditorState<Post>(other, { type: "edit" });
  });

  it("with no type argument the preview is loose", () => {
    expectTypeOf<
      Extract<InPlaceEditorEvent, { type: "save" }>["preview"]
    >().toEqualTypeOf<LooseRecord>();
  });
});
