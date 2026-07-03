/**
 * P7a-T1 tests: `RecordContext` + `RecordContextProvider` + `useRecordContext`.
 *
 * Behavior clusters (ra-core parity, adapted to the chelone conditional-render
 * convention shared with `ResourceContextProvider`):
 * 1. Provider present — a descendant `useRecordContext()` reads the value.
 * 2. Prop override — `useRecordContext({ record })` wins over the context.
 * 3. Absent — no provider, no prop → `undefined`.
 * 4. Conditional render — a provider with no `value` is a pass-through, so a
 *    nested `useRecordContext` sees the closest NON-empty ancestor.
 * 5. Loose records — a record without a schema (`LooseRecord`) round-trips.
 */

import { cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  RecordContext,
  RecordContextProvider,
  useRecordContext,
} from "./record-context";

afterEach(() => {
  cleanup();
});

interface Post {
  id: number;
  title: string;
}

describe("useRecordContext", () => {
  it("reads the record from an ancestor RecordContextProvider", () => {
    const record: Post = { id: 1, title: "Hello" };
    const { result } = renderHook(() => useRecordContext<Post>(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <RecordContextProvider value={record}>{children}</RecordContextProvider>
      ),
    });
    expect(result.current).toEqual(record);
  });

  it("lets a `record` prop override the ambient context value", () => {
    const ambient: Post = { id: 1, title: "Ambient" };
    const override: Post = { id: 2, title: "Override" };
    const { result } = renderHook(
      () => useRecordContext<Post>({ record: override }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <RecordContextProvider value={ambient}>
            {children}
          </RecordContextProvider>
        ),
      },
    );
    expect(result.current).toEqual(override);
  });

  it("returns the prop record when there is no provider", () => {
    const override: Post = { id: 2, title: "Override" };
    const { result } = renderHook(() =>
      useRecordContext<Post>({ record: override }),
    );
    expect(result.current).toEqual(override);
  });

  it("returns undefined with no provider and no prop", () => {
    const { result } = renderHook(() => useRecordContext<Post>());
    expect(result.current).toBeUndefined();
  });

  it("returns undefined when props is passed but carries no record", () => {
    const { result } = renderHook(() => useRecordContext<Post>({}));
    expect(result.current).toBeUndefined();
  });

  it("reads a loose record with no registered schema", () => {
    const record = { id: 7, extra: "field", nested: { n: 1 } };
    const { result } = renderHook(() => useRecordContext(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <RecordContextProvider value={record}>{children}</RecordContextProvider>
      ),
    });
    expect(result.current).toEqual(record);
  });
});

describe("RecordContextProvider (conditional-render convention)", () => {
  it("is a pass-through when no `value` is provided (no empty context pushed)", () => {
    const outer: Post = { id: 1, title: "Outer" };
    const Probe = () => {
      const record = useRecordContext<Post>();
      return <span data-testid="title">{record?.title ?? "none"}</span>;
    };
    render(
      <RecordContextProvider value={outer}>
        {/* inner provider with no value must NOT shadow the outer record */}
        <RecordContextProvider>
          <Probe />
        </RecordContextProvider>
      </RecordContextProvider>,
    );
    expect(screen.getByTestId("title").textContent).toBe("Outer");
  });

  it("shadows the outer record when the inner provider has its own value", () => {
    const outer: Post = { id: 1, title: "Outer" };
    const inner: Post = { id: 2, title: "Inner" };
    const Probe = () => {
      const record = useRecordContext<Post>();
      return <span data-testid="title">{record?.title ?? "none"}</span>;
    };
    render(
      <RecordContextProvider value={outer}>
        <RecordContextProvider value={inner}>
          <Probe />
        </RecordContextProvider>
      </RecordContextProvider>,
    );
    expect(screen.getByTestId("title").textContent).toBe("Inner");
  });

  it("renders children when value is absent (subtree still mounts)", () => {
    render(
      <RecordContextProvider>
        <span data-testid="child">child</span>
      </RecordContextProvider>,
    );
    expect(screen.getByTestId("child").textContent).toBe("child");
  });
});

describe("RecordContext", () => {
  it("exposes the raw context with an undefined default", () => {
    const { result } = renderHook(() => {
      // Using the raw context confirms the default is undefined.
      return useRecordContext();
    });
    expect(result.current).toBeUndefined();
    expect(RecordContext.displayName).toBe("RecordContext");
  });
});
