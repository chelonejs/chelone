import { expectTypeOf, it } from "vitest";
import {
  type RichTextToolbarItemId,
  richTextSanitizeOptions,
  richTextStarterKitOptions,
} from "./rich-text";

declare const withoutRedo: Omit<Record<RichTextToolbarItemId, string>, "redo">;

it("a Record over RichTextToolbarItemId needs every id", () => {
  const all: Record<RichTextToolbarItemId, string> = {
    bold: "",
    italic: "",
    underline: "",
    strike: "",
    code: "",
    clearFormatting: "",
    link: "",
    bulletList: "",
    orderedList: "",
    blockquote: "",
    codeBlock: "",
    horizontalRule: "",
    undo: "",
    redo: "",
  };
  expectTypeOf(all).toHaveProperty("redo");

  // @ts-expect-error redo is missing
  const missing: Record<RichTextToolbarItemId, string> = withoutRedo;
  expectTypeOf(missing).toBeObject();
});

it("the option objects are readonly", () => {
  // @ts-expect-error FORBID_ATTR is readonly
  richTextSanitizeOptions.FORBID_ATTR = [];
  // @ts-expect-error the list is a readonly tuple
  richTextSanitizeOptions.FORBID_ATTR.push("onclick");
  // @ts-expect-error openOnClick is readonly
  richTextStarterKitOptions.link.openOnClick = true;
  // @ts-expect-error levels is a readonly tuple
  richTextStarterKitOptions.heading.levels.push(1);
});
