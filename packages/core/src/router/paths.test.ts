import { describe, expect, it } from "vitest";
import { createPath, joinBasename, removeDoubleSlashes } from "./paths";

describe("removeDoubleSlashes", () => {
  it("collapses runs of slashes into one", () => {
    expect(removeDoubleSlashes("/posts//1")).toBe("/posts/1");
    expect(removeDoubleSlashes("//a///b//c")).toBe("/a/b/c");
  });

  it("leaves a clean path untouched", () => {
    expect(removeDoubleSlashes("/posts/1")).toBe("/posts/1");
  });

  it("does not touch the protocol slashes of an absolute URL", () => {
    expect(removeDoubleSlashes("https://example.com//a")).toBe(
      "https://example.com/a",
    );
  });
});

describe("joinBasename", () => {
  it("prefixes the basename", () => {
    expect(joinBasename("/posts", "/admin")).toBe("/admin/posts");
  });

  it("is a no-op for an empty basename", () => {
    expect(joinBasename("/posts", "")).toBe("/posts");
    expect(joinBasename("/posts")).toBe("/posts");
  });

  it("collapses the seam double-slash", () => {
    expect(joinBasename("/posts", "/admin/")).toBe("/admin/posts");
  });

  it("strips a trailing slash on the basename", () => {
    expect(joinBasename("/", "/admin")).toBe("/admin");
  });
});

describe("createPath", () => {
  it("builds a list path", () => {
    expect(createPath({ type: "list", resource: "posts" })).toBe("/posts");
  });

  it("builds a create path", () => {
    expect(createPath({ type: "create", resource: "posts" })).toBe(
      "/posts/create",
    );
  });

  it("builds an edit path", () => {
    expect(createPath({ type: "edit", resource: "posts", id: 1 })).toBe(
      "/posts/1",
    );
  });

  it("builds a show path", () => {
    expect(createPath({ type: "show", resource: "posts", id: 1 })).toBe(
      "/posts/1/show",
    );
  });

  it("encodes the id", () => {
    expect(createPath({ type: "edit", resource: "posts", id: "a/b" })).toBe(
      "/posts/a%2Fb",
    );
    expect(createPath({ type: "show", resource: "posts", id: "a b" })).toBe(
      "/posts/a%20b/show",
    );
  });

  it("falls back to the list path when id is null on edit/show", () => {
    expect(createPath({ type: "edit", resource: "posts", id: null })).toBe(
      "/posts",
    );
    expect(createPath({ type: "show", resource: "posts", id: undefined })).toBe(
      "/posts",
    );
  });

  it("returns a custom string type verbatim (still basename-prefixed + slash-collapsed)", () => {
    expect(createPath({ type: "/settings" })).toBe("/settings");
    expect(createPath({ type: "/settings/general" }, "/admin")).toBe(
      "/admin/settings/general",
    );
  });

  it("applies the basename to resource paths", () => {
    expect(createPath({ type: "list", resource: "posts" }, "/admin")).toBe(
      "/admin/posts",
    );
    expect(
      createPath({ type: "edit", resource: "posts", id: 7 }, "/admin"),
    ).toBe("/admin/posts/7");
  });

  it("collapses double slashes in the composed path", () => {
    expect(createPath({ type: "list", resource: "posts" }, "/admin/")).toBe(
      "/admin/posts",
    );
  });
});
