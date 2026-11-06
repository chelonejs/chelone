import { describe, expectTypeOf, it } from "vitest";
import type { SourcePath, SourceValue } from "../resource/source-path";
import type { FieldName, FieldValue } from "./field-name";

interface Draft {
  title: string;
  views?: number | null;
  author?: { name: string } | null;
  tags: { label: string; note?: { text: string } }[];
}

describe("form-core's path types and chelone's", () => {
  it("name the same paths of a record", () => {
    expectTypeOf<FieldName<Draft>>().toEqualTypeOf<SourcePath<Draft>>();
  });

  it("read the same value at a path", () => {
    expectTypeOf<FieldValue<Draft, "title">>().toEqualTypeOf<
      SourceValue<Draft, "title">
    >();
    expectTypeOf<FieldValue<Draft, "views">>().toEqualTypeOf<
      SourceValue<Draft, "views">
    >();
    expectTypeOf<FieldValue<Draft, "author.name">>().toEqualTypeOf<
      SourceValue<Draft, "author.name">
    >();
    expectTypeOf<FieldValue<Draft, "tags[0].label">>().toEqualTypeOf<
      SourceValue<Draft, "tags[0].label">
    >();
    expectTypeOf<FieldValue<Draft, "tags[0].note.text">>().toEqualTypeOf<
      SourceValue<Draft, "tags[0].note.text">
    >();
  });
});
