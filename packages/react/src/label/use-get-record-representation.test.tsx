/**
 * P7a-T2: `useGetRecordRepresentation(resource?)` — resolve a record to a
 * display string (parity: ra-core `useGetRecordRepresentation`). Reads the
 * resource's `recordRepresentation` from the registry definition:
 * - a function → call it with the record;
 * - a string → the value at that source path off the record;
 * - a React element → returned verbatim;
 * - otherwise the default chain: name → title → label → reference → `#${id}`.
 * An empty / nullish record → `""`.
 */

import {
  createResourceRegistry,
  getAtPath,
  type ResourceRegistry,
  type ResourceRepresentation,
} from "@chelone/core";
import { renderHook } from "@testing-library/react";
import { isValidElement, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ResourceContextProvider, ResourceRegistryProvider } from "../resource";
import {
  useGetRecordRepresentation,
  useGetRecordRepresentationText,
} from "./use-get-record-representation";

interface WrapperOpts {
  registry: ResourceRegistry;
  resource?: string;
}

function makeWrapper({ registry, resource }: WrapperOpts) {
  return ({ children }: { children: ReactNode }) => (
    <ResourceRegistryProvider registry={registry}>
      <ResourceContextProvider value={resource}>
        {children}
      </ResourceContextProvider>
    </ResourceRegistryProvider>
  );
}

function registryWith(
  name: string,
  recordRepresentation?: ResourceRepresentation,
): ResourceRegistry {
  const registry = createResourceRegistry();
  registry.register({
    name,
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
    recordRepresentation,
  });
  return registry;
}

afterEach(() => {});

describe("useGetRecordRepresentation", () => {
  it("uses a function recordRepresentation", () => {
    const registry = registryWith(
      "posts",
      (r) => `Post: ${String(getAtPath(r, "title"))}`,
    );
    const { result } = renderHook(() => useGetRecordRepresentation("posts"), {
      wrapper: makeWrapper({ registry, resource: "posts" }),
    });
    expect(result.current({ id: 1, title: "Hello" })).toBe("Post: Hello");
  });

  it("uses a string recordRepresentation as a (deep) source path", () => {
    const registry = registryWith("posts", "author.name");
    const { result } = renderHook(() => useGetRecordRepresentation("posts"), {
      wrapper: makeWrapper({ registry, resource: "posts" }),
    });
    expect(result.current({ id: 1, author: { name: "Ada" } })).toBe("Ada");
  });

  it("a string-path representation reads a bracket path", () => {
    const registry = registryWith("posts", "tags[1].label");
    const { result } = renderHook(() => useGetRecordRepresentation("posts"), {
      wrapper: makeWrapper({ registry, resource: "posts" }),
    });
    expect(
      result.current({ id: 1, tags: [{ label: "a" }, { label: "b" }] }),
    ).toBe("b");
  });

  it("an empty path returns the record", () => {
    const registry = registryWith("posts", "");
    const record = { id: 1, title: "Whole" };
    const { result } = renderHook(() => useGetRecordRepresentation("posts"), {
      wrapper: makeWrapper({ registry, resource: "posts" }),
    });
    expect(result.current(record)).toBe(record);
  });

  it("returns a React element recordRepresentation verbatim", () => {
    const element = <span>custom</span>;
    const registry = registryWith("posts", element);
    const { result } = renderHook(() => useGetRecordRepresentation("posts"), {
      wrapper: makeWrapper({ registry, resource: "posts" }),
    });
    const out = result.current({ id: 1 });
    expect(isValidElement(out)).toBe(true);
    expect(out).toBe(element);
  });

  it("falls back to the default chain: name → title → label → reference → #id", () => {
    const registry = registryWith("posts"); // no recordRepresentation
    const { result } = renderHook(() => useGetRecordRepresentation("posts"), {
      wrapper: makeWrapper({ registry, resource: "posts" }),
    });
    expect(result.current({ id: 1, name: "N" })).toBe("N");
    expect(result.current({ id: 2, title: "T" })).toBe("T");
    expect(result.current({ id: 3, label: "L" })).toBe("L");
    expect(result.current({ id: 4, reference: "R" })).toBe("R");
    expect(result.current({ id: 5 })).toBe("#5");
  });

  it("skips empty-string default-chain fields", () => {
    const registry = registryWith("posts");
    const { result } = renderHook(() => useGetRecordRepresentation("posts"), {
      wrapper: makeWrapper({ registry, resource: "posts" }),
    });
    // empty name → fall through to title
    expect(result.current({ id: 1, name: "", title: "T" })).toBe("T");
  });

  it("returns an empty string for a nullish record", () => {
    const registry = registryWith("posts");
    const { result } = renderHook(() => useGetRecordRepresentation("posts"), {
      wrapper: makeWrapper({ registry, resource: "posts" }),
    });
    expect(result.current(undefined)).toBe("");
    expect(result.current(null)).toBe("");
  });

  it("reads the resource from context when no argument is passed", () => {
    const registry = registryWith("posts", "title");
    const { result } = renderHook(() => useGetRecordRepresentation(), {
      wrapper: makeWrapper({ registry, resource: "posts" }),
    });
    expect(result.current({ id: 1, title: "Ctx" })).toBe("Ctx");
  });

  it("returns a stable callback identity across re-renders", () => {
    const registry = registryWith("posts", "title");
    const { result, rerender } = renderHook(
      () => useGetRecordRepresentation("posts"),
      { wrapper: makeWrapper({ registry, resource: "posts" }) },
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe("useGetRecordRepresentationText", () => {
  it("the text form reads a string path", () => {
    const registry = registryWith("posts", "author.name");
    const { result } = renderHook(
      () => useGetRecordRepresentationText("posts"),
      { wrapper: makeWrapper({ registry, resource: "posts" }) },
    );
    expect(result.current({ id: 1, author: { name: "Ada" } })).toBe("Ada");
    expect(result.current({ id: 2, author: {} })).toBe("");
  });

  it("the text form uses a function's string result", () => {
    const registry = registryWith(
      "posts",
      (r) => `Post: ${String(getAtPath(r, "title"))}`,
    );
    const { result } = renderHook(
      () => useGetRecordRepresentationText("posts"),
      { wrapper: makeWrapper({ registry, resource: "posts" }) },
    );
    expect(result.current({ id: 1, title: "Hello" })).toBe("Post: Hello");
  });

  it("the text form falls back to the default chain for an element", () => {
    const registry = registryWith("posts", <span>custom</span>);
    const { result } = renderHook(
      () => useGetRecordRepresentationText("posts"),
      { wrapper: makeWrapper({ registry, resource: "posts" }) },
    );
    expect(result.current({ id: 1, name: "N" })).toBe("N");
    expect(result.current({ id: 2, title: "T" })).toBe("T");
    expect(result.current({ id: 3 })).toBe("#3");
  });

  it("the text form falls back to the default chain for a function returning an element", () => {
    const registry = registryWith("posts", () => <b>bold</b>);
    const { result } = renderHook(
      () => useGetRecordRepresentationText("posts"),
      { wrapper: makeWrapper({ registry, resource: "posts" }) },
    );
    expect(result.current({ id: 1, name: "N" })).toBe("N");
  });

  it("the text form uses a function's numeric result as a string", () => {
    const registry = registryWith("posts", (r) => Number(r.id) * 2);
    const { result } = renderHook(
      () => useGetRecordRepresentationText("posts"),
      { wrapper: makeWrapper({ registry, resource: "posts" }) },
    );
    expect(result.current({ id: 4 })).toBe("8");
  });
});
