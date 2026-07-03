import type { EditControllerState } from "@chelone/core";
import { assertType, describe, it } from "vitest";
import type {
  CreateContextValue,
  EditContextValue,
  ShowContextValue,
} from "./record-view-context";
import type { SaveContextValue } from "./save-context";

interface Post {
  id: number;
  title: string;
}

describe("record view context types", () => {
  it("EditContextValue carries the record-controller state plus the save surface", () => {
    const edit = {} as EditContextValue<Post>;
    assertType<Post | undefined>(edit.record);
    assertType<boolean>(edit.saving);
    assertType<boolean>(edit.isPending);
    assertType<boolean>(edit.isFetching);
    assertType<string>(edit.resource);
    // The vanilla controller state is a structural subset.
    assertType<EditControllerState<Post>>({
      record: edit.record,
      isPending: edit.isPending,
      isFetching: edit.isFetching,
      error: edit.error,
      saving: edit.saving,
    });
  });

  it("EditContextValue is a SaveContextValue (edit publishes into SaveContext)", () => {
    assertType<SaveContextValue>({} as EditContextValue<Post>);
  });

  it("CreateContextValue is a SaveContextValue and carries a partial seed record", () => {
    const create = {} as CreateContextValue<Post>;
    assertType<Partial<Post>>(create.record);
    assertType<boolean>(create.saving);
    assertType<SaveContextValue>(create);
  });

  it("ShowContextValue has no save surface", () => {
    const show = {} as ShowContextValue<Post>;
    assertType<Post | undefined>(show.record);
    assertType<boolean>(show.isPending);
    // @ts-expect-error — show is read-only, no save handler.
    assertType<() => unknown>(show.save);
  });
});
