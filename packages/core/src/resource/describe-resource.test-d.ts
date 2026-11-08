import { describe, expectTypeOf, it } from "vitest";
import { describeBlockAttrs } from "../block-editor/block-document";
import {
  describeField,
  type FieldDescriptor,
  type ResourceDescriptor,
} from "./describe-resource";
import type { AnySourcePath } from "./source-path";

describe("FieldDescriptor", () => {
  it("describeField keeps the literal source it was given", () => {
    const field = describeField("title", undefined, undefined);
    expectTypeOf(field).toEqualTypeOf<FieldDescriptor<"title">>();
  });

  it("a resource's fields are sourced by the registry-wide path", () => {
    expectTypeOf<
      ResourceDescriptor["fields"][number]["source"]
    >().toEqualTypeOf<AnySourcePath>();
  });

  it("bare FieldDescriptor defaults to AnySourcePath", () => {
    expectTypeOf<FieldDescriptor["source"]>().toEqualTypeOf<AnySourcePath>();
  });

  it("a block's attrs are plain strings, not resource paths", () => {
    expectTypeOf(describeBlockAttrs).returns.toEqualTypeOf<
      FieldDescriptor<string>[]
    >();
  });
});
