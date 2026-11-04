import { expectTypeOf, it } from "vitest";
import type { ResourceMap } from "../resource/registry";
import type { SourcePath, SourceValue } from "../resource/source-path";
import { createFormController } from "./form-controller";
import {
  createFormHandle,
  type FormContextHandle,
  type FormContextHandleOf,
  type FormHandle,
  isResourceHandle,
  type ResourceFormHandle,
  toFormContextHandle,
  type UnboundFormHandle,
} from "./form-handle";

interface Post {
  id: number;
  title: string;
  views: number;
  author: { name: string; email: string };
  tags: { label: string }[];
}

interface Tag {
  id: string;
  label: string;
}

/** An explicit resource map: name -> record. Nothing is registered here. */
type Resources = { posts: Post; tags: Tag };

type Handles = FormContextHandleOf<Resources>;

declare const handles: Handles;

it("the context handle is a union the registry can name", () => {
  expectTypeOf(handles).not.toBeAny();
  expectTypeOf(handles.resource).toEqualTypeOf<"posts" | "tags" | undefined>();
});

it("a resource name narrows the union to that resource's handle", () => {
  if (handles.resource === "posts") {
    expectTypeOf(handles).toEqualTypeOf<
      ResourceFormHandle<"posts", Partial<Post>>
    >();
    // The path type is the real `dot.paths` one: a nested path is legal and its
    // value is the value at that path, not `unknown`.
    expectTypeOf(handles.getFieldValue)
      .parameter(0)
      .toEqualTypeOf<SourcePath<Partial<Post>>>();
    expectTypeOf(handles.getFieldValue("author.name")).toEqualTypeOf<
      SourceValue<Partial<Post>, "author.name">
    >();
    expectTypeOf(handles.getFieldValue("tags[0].label")).not.toBeUnknown();
    // @ts-expect-error -- "titel" is not a path of Post
    handles.getFieldValue("titel");
    // @ts-expect-error -- a number is not the value at `title`
    handles.setFieldValue("title", 5);
  }
});

it("no resource leaves the unbound handle, whose values are unknown", () => {
  if (handles.resource === undefined) {
    expectTypeOf(handles).toEqualTypeOf<UnboundFormHandle>();
    expectTypeOf(handles.ambient.getFieldValue("anything")).toBeUnknown();
    expectTypeOf(handles.getFieldValue("anything")).toBeUnknown();
  }
});

it("an unregistered map is the unbound handle alone", () => {
  expectTypeOf<
    FormContextHandleOf<ResourceMap>
  >().toEqualTypeOf<UnboundFormHandle>();
  expectTypeOf<FormContextHandle>().toEqualTypeOf<UnboundFormHandle>();
});

it("createFormHandle types every path of its form's record", () => {
  const controller = createFormController<Partial<Post>>({
    defaultValues: { title: "a" },
    save: async () => undefined,
  });
  const handle = createFormHandle(controller.form);
  expectTypeOf(handle).not.toBeAny();
  expectTypeOf(handle).toEqualTypeOf<FormHandle<Partial<Post>>>();
  expectTypeOf(handle.getSnapshot().values).toEqualTypeOf<Partial<Post>>();
  expectTypeOf(handle.ambient.store.state.values).toBeUnknown();
  expectTypeOf(handle.ambient.getFieldValue("anything")).toBeUnknown();
  expectTypeOf(handle.getFieldValue("author.name")).toEqualTypeOf<
    SourceValue<Partial<Post>, "author.name">
  >();
  // @ts-expect-error -- "titel" is not a path of Post
  handle.getFieldValue("titel");
  // @ts-expect-error -- a number is not the value at `title`
  handle.setFieldValue("title", 5);
});

it("toFormContextHandle widens a handle to the context union", () => {
  const controller = createFormController<Partial<Post>>({
    save: async () => undefined,
  });
  expectTypeOf(
    toFormContextHandle(createFormHandle(controller.form), "posts"),
  ).toEqualTypeOf<FormContextHandle>();
});

it("isResourceHandle narrows where a generic body cannot", () => {
  // The probe: a generic name leaves the union in play, so no plain comparison
  // narrows it and a predicate is the only way in.
  function probe<TName extends "posts" | "tags">(h: Handles, name: TName) {
    if (h.resource === name) {
      // @ts-expect-error -- still a union: `title` is no path of a tags record
      h.getFieldValue("title");
    }
  }
  void probe;

  if (isResourceHandle(handles, "posts")) {
    expectTypeOf(handles.resource).toEqualTypeOf<"posts">();
    expectTypeOf(handles.getFieldValue("title")).toEqualTypeOf<
      SourceValue<Partial<Post>, "title">
    >();
    const tagged: ResourceFormHandle<"posts", Partial<Post>> = handles;
    void tagged;
  }

  // A generic body: the name is not a literal, and the predicate still lands
  // on the member that names it.
  function pick<TName extends "posts" | "tags">(h: Handles, name: TName) {
    if (isResourceHandle(h, name)) {
      const tagged: ResourceFormHandle<TName> = h;
      void tagged;
    }
  }
  void pick;
});
