/**
 * The Vue add-on fields are generic over their record with `ResourceRecord` as
 * the bound, so an app's own interface is a legal record: `LooseRecord` as the
 * bound refused one, since an interface carries no index signature.
 */

import { assertType, describe, it } from "vitest";
import type { MdxFieldProps } from "./mdx-editor/mdx-field.vue";
import type { MonacoJsonFieldProps } from "./monaco/monaco-json-field.vue";
import type { RichTextFieldProps } from "./rich-text-input/rich-text-field.vue";

interface Post {
  id: number;
  title: string;
  body: string;
  metadata: { columns: boolean };
}

declare const post: Post;

describe("add-on field records", () => {
  it("a field takes a record typed by an interface", () => {
    assertType<MdxFieldProps<Post>>({ source: "body", record: post });
    assertType<RichTextFieldProps<Post>>({ source: "body", record: post });
    assertType<MonacoJsonFieldProps<Post>>({
      source: "metadata",
      record: post,
    });
  });

  it("a field still takes the loose record of an app that registered nothing", () => {
    assertType<MdxFieldProps>({
      source: "notes",
      record: { id: 1, notes: "x" },
    });
    assertType<RichTextFieldProps>({
      source: "notes",
      record: { id: 1, notes: "x" },
    });
    assertType<MonacoJsonFieldProps>({
      source: "notes",
      record: { id: 1, notes: "x" },
    });
  });

  it("a field rejects a record with no id", () => {
    // @ts-expect-error a record has an id
    assertType<MdxFieldProps>({ source: "body", record: { title: "x" } });
    // @ts-expect-error a record has an id
    assertType<RichTextFieldProps>({ source: "body", record: { title: "x" } });
    // @ts-expect-error a record has an id
    assertType<MonacoJsonFieldProps>({
      source: "body",
      record: { title: "x" },
    });
  });
});
