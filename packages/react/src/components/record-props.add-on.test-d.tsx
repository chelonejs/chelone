/**
 * The add-on fields are generic over their record with `ResourceRecord` as the
 * bound, so an app's own interface is a legal record: `LooseRecord` as the bound
 * refused one, since an interface carries no index signature.
 */

import { describe, expectTypeOf, it } from "vitest";
import { MdxField } from "./mdx-editor/mdx-field";
import { MonacoJsonField } from "./monaco/monaco-json-field";
import { RichTextField } from "./rich-text-input/rich-text-field";

interface Post {
  id: number;
  title: string;
  body: string;
  metadata: { columns: boolean };
}

declare const post: Post;

describe("add-on field records", () => {
  it("a field takes a record typed by an interface", () => {
    expectTypeOf(<MdxField source="body" record={post} />).not.toBeAny();
    expectTypeOf(<RichTextField source="body" record={post} />).not.toBeAny();
    expectTypeOf(
      <MonacoJsonField source="metadata" record={post} />,
    ).not.toBeAny();
  });

  it("a field still takes the loose record of an app that registered nothing", () => {
    expectTypeOf(
      <MdxField source="notes" record={{ id: 1, notes: "x" }} />,
    ).not.toBeAny();
    expectTypeOf(
      <RichTextField source="notes" record={{ id: 1, notes: "x" }} />,
    ).not.toBeAny();
    expectTypeOf(
      <MonacoJsonField source="notes" record={{ id: 1, notes: "x" }} />,
    ).not.toBeAny();
  });

  it("a field rejects a record with no id", () => {
    // @ts-expect-error a record has an id
    <MdxField source="body" record={{ title: "x" }} />;
    // @ts-expect-error a record has an id
    <RichTextField source="body" record={{ title: "x" }} />;
    // @ts-expect-error a record has an id
    <MonacoJsonField source="body" record={{ title: "x" }} />;
  });
});
