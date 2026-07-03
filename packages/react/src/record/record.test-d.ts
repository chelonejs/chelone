/**
 * P7a-T1 type tests: `useRecordContext` / `useFieldValue` generics.
 *
 * Verifies the record generic threads through and the results are typed:
 * - `useRecordContext<Post>()` → `Post | undefined`;
 * - `useFieldValue<Post>({ source })` → `unknown` (source is a string path,
 *   the value at an arbitrary path is not statically knowable without the
 *   heavy ExtractRecordPaths machinery — parity with a loose read).
 */

import type { LooseRecord } from "@chelone/core";
import { assertType, describe, it } from "vitest";
import { useRecordContext } from "./record-context";
import { useFieldValue } from "./use-field-value";

interface Post {
  id: number;
  title: string;
}

describe("useRecordContext types", () => {
  it("returns RecordType | undefined", () => {
    const record = useRecordContext<Post>();
    assertType<Post | undefined>(record);
  });

  it("defaults to LooseRecord | undefined", () => {
    const record = useRecordContext();
    assertType<LooseRecord | undefined>(record);
  });

  it("accepts a record prop of the same type", () => {
    const record = useRecordContext<Post>({ record: { id: 1, title: "x" } });
    assertType<Post | undefined>(record);
  });
});

describe("useFieldValue types", () => {
  it("accepts a source string and an optional defaultValue", () => {
    const value = useFieldValue({ source: "title" });
    assertType<unknown>(value);
  });

  it("accepts a typed record and a defaultValue", () => {
    const value = useFieldValue<Post>({
      source: "title",
      record: { id: 1, title: "x" },
      defaultValue: "fallback",
    });
    assertType<unknown>(value);
  });
});
