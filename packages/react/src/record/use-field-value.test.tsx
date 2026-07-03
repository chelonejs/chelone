/**
 * P7a-T1 tests: `useFieldValue({ source, record?, defaultValue? })`.
 *
 * ra-core parity (behavior of `lodash/get(record, source, defaultValue)`,
 * clean-room reimplemented — no lodash dependency):
 * - reads the value at a (possibly deep, dot/bracket) source from the
 *   `record` prop ?? the ambient RecordContext;
 * - `defaultValue` replaces ONLY `undefined` (not `null`/`0`/`false`/`""`);
 * - the `record` prop overrides the RecordContext;
 * - reads from the RecordContext (NOT a SourceContext) on purpose.
 */

import { cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { RecordContextProvider } from "./record-context";
import { useFieldValue } from "./use-field-value";

afterEach(() => {
  cleanup();
});

const wrapWith =
  (record: unknown) =>
  ({ children }: { children: ReactNode }) => (
    <RecordContextProvider value={record as Record<string, unknown>}>
      {children}
    </RecordContextProvider>
  );

describe("useFieldValue", () => {
  it("reads a top-level field from the ambient record", () => {
    const { result } = renderHook(() => useFieldValue({ source: "title" }), {
      wrapper: wrapWith({ id: 1, title: "Hello" }),
    });
    expect(result.current).toBe("Hello");
  });

  it("reads a deep dotted source", () => {
    const { result } = renderHook(
      () => useFieldValue({ source: "author.name" }),
      { wrapper: wrapWith({ id: 1, author: { name: "Ada" } }) },
    );
    expect(result.current).toBe("Ada");
  });

  it("reads a bracket-indexed source", () => {
    const { result } = renderHook(
      () => useFieldValue({ source: "tags[1].label" }),
      { wrapper: wrapWith({ id: 1, tags: [{ label: "a" }, { label: "b" }] }) },
    );
    expect(result.current).toBe("b");
  });

  it("reads a numeric-dot source (lodash a.0.b syntax)", () => {
    const { result } = renderHook(
      () => useFieldValue({ source: "tags.0.label" }),
      { wrapper: wrapWith({ id: 1, tags: [{ label: "a" }] }) },
    );
    expect(result.current).toBe("a");
  });

  it("falls back to defaultValue when the field is missing", () => {
    const { result } = renderHook(
      () => useFieldValue({ source: "missing", defaultValue: "D" }),
      { wrapper: wrapWith({ id: 1, title: "Hello" }) },
    );
    expect(result.current).toBe("D");
  });

  it("falls back to defaultValue when an intermediate path is missing", () => {
    const { result } = renderHook(
      () => useFieldValue({ source: "a.b.c", defaultValue: "D" }),
      { wrapper: wrapWith({ id: 1 }) },
    );
    expect(result.current).toBe("D");
  });

  it("falls back to defaultValue when the field value is undefined", () => {
    const { result } = renderHook(
      () => useFieldValue({ source: "title", defaultValue: "D" }),
      { wrapper: wrapWith({ id: 1, title: undefined }) },
    );
    expect(result.current).toBe("D");
  });

  it("does NOT replace null with defaultValue", () => {
    const { result } = renderHook(
      () => useFieldValue({ source: "title", defaultValue: "D" }),
      { wrapper: wrapWith({ id: 1, title: null }) },
    );
    expect(result.current).toBeNull();
  });

  it("does NOT replace falsy-but-present values (0, false, '') with defaultValue", () => {
    const { result: zero } = renderHook(
      () => useFieldValue({ source: "n", defaultValue: 99 }),
      { wrapper: wrapWith({ id: 1, n: 0 }) },
    );
    expect(zero.current).toBe(0);

    const { result: flag } = renderHook(
      () => useFieldValue({ source: "flag", defaultValue: true }),
      { wrapper: wrapWith({ id: 1, flag: false }) },
    );
    expect(flag.current).toBe(false);

    const { result: empty } = renderHook(
      () => useFieldValue({ source: "s", defaultValue: "D" }),
      { wrapper: wrapWith({ id: 1, s: "" }) },
    );
    expect(empty.current).toBe("");
  });

  it("returns undefined for a missing field with no defaultValue", () => {
    const { result } = renderHook(() => useFieldValue({ source: "missing" }), {
      wrapper: wrapWith({ id: 1 }),
    });
    expect(result.current).toBeUndefined();
  });

  it("uses the `record` prop over the ambient RecordContext", () => {
    const { result } = renderHook(
      () =>
        useFieldValue({ source: "title", record: { id: 2, title: "Prop" } }),
      { wrapper: wrapWith({ id: 1, title: "Ambient" }) },
    );
    expect(result.current).toBe("Prop");
  });

  it("returns defaultValue when there is no record at all", () => {
    const { result } = renderHook(() =>
      useFieldValue({ source: "title", defaultValue: "D" }),
    );
    expect(result.current).toBe("D");
  });

  it("returns undefined when there is no record and no defaultValue", () => {
    const { result } = renderHook(() => useFieldValue({ source: "title" }));
    expect(result.current).toBeUndefined();
  });
});
