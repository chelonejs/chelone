import { describe, expect, it } from "vitest";
import { matchPath } from "./match";

describe("matchPath — static patterns", () => {
  it("matches an exact static path", () => {
    expect(matchPath("/posts", "/posts")).toEqual({
      params: {},
      pathname: "/posts",
      pathnameBase: "/posts",
    });
  });

  it("returns null when a static path does not match", () => {
    expect(matchPath("/posts", "/comments")).toBeNull();
  });

  it("returns null on a partial static match (no trailing splat)", () => {
    expect(matchPath("/posts", "/posts/1")).toBeNull();
  });

  it("is case-insensitive on the literal segments", () => {
    expect(matchPath("/Posts", "/posts")).not.toBeNull();
  });

  it("matches the root pattern", () => {
    expect(matchPath("/", "/")).toEqual({
      params: {},
      pathname: "/",
      pathnameBase: "/",
    });
  });
});

describe("matchPath — colon params", () => {
  it("captures a single param", () => {
    expect(matchPath("/posts/:id", "/posts/42")).toEqual({
      params: { id: "42" },
      pathname: "/posts/42",
      pathnameBase: "/posts/42",
    });
  });

  it("captures multiple params", () => {
    expect(
      matchPath("/posts/:id/comments/:cid", "/posts/1/comments/9"),
    ).toEqual({
      params: { id: "1", cid: "9" },
      pathname: "/posts/1/comments/9",
      pathnameBase: "/posts/1/comments/9",
    });
  });

  it("decodes the captured param value", () => {
    const m = matchPath("/posts/:id", "/posts/a%2Fb");
    expect(m?.params.id).toBe("a/b");
  });

  it("does not match a missing dynamic segment", () => {
    expect(matchPath("/posts/:id", "/posts")).toBeNull();
  });

  it("does not let a param swallow multiple segments", () => {
    expect(matchPath("/posts/:id", "/posts/1/extra")).toBeNull();
  });
});

describe("matchPath — splat (*)", () => {
  it("captures the remainder under the '*' key", () => {
    expect(matchPath("/posts/*", "/posts/1/show")).toEqual({
      params: { "*": "1/show" },
      pathname: "/posts/1/show",
      pathnameBase: "/posts",
    });
  });

  it("matches an empty remainder", () => {
    expect(matchPath("/posts/*", "/posts")).toEqual({
      params: { "*": "" },
      pathname: "/posts",
      pathnameBase: "/posts",
    });
  });

  it("matches an empty remainder with a trailing slash", () => {
    expect(matchPath("/posts/*", "/posts/")).toEqual({
      params: { "*": "" },
      pathname: "/posts",
      pathnameBase: "/posts",
    });
  });

  it("combines params and a splat, with pathnameBase excluding the remainder", () => {
    expect(matchPath("/:resource/*", "/posts/1/show")).toEqual({
      params: { resource: "posts", "*": "1/show" },
      pathname: "/posts/1/show",
      pathnameBase: "/posts",
    });
  });

  it("bare splat matches everything (react-router: remainder has no leading slash)", () => {
    expect(matchPath("*", "/anything/here")).toEqual({
      params: { "*": "anything/here" },
      pathname: "/anything/here",
      pathnameBase: "/",
    });
  });
});
