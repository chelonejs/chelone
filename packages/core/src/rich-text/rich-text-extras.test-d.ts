import { expectTypeOf, it } from "vitest";
import {
  defaultRichTextImageRules,
  normalizeRichTextUpload,
  type RichTextUpload,
  richTextCodeBlockOptions,
  richTextImageActions,
  richTextStyledSanitizeOptions,
} from "./rich-text-extras";

it("normalizeRichTextUpload takes a string or an id and src", () => {
  expectTypeOf(normalizeRichTextUpload)
    .parameter(0)
    .toEqualTypeOf<string | { id: string | number; src: string }>();
  expectTypeOf(normalizeRichTextUpload).returns.toEqualTypeOf<{
    id: string | null;
    src: string;
  } | null>();
  expectTypeOf<RichTextUpload>().toEqualTypeOf<{
    id: string | null;
    src: string;
  }>();

  normalizeRichTextUpload("a");
  normalizeRichTextUpload({ id: 1, src: "a" });
  // @ts-expect-error src is required
  normalizeRichTextUpload({ id: 1 });
  // @ts-expect-error id is required
  normalizeRichTextUpload({ src: "a" });
  // @ts-expect-error a number is not an upload result
  normalizeRichTextUpload(1);
});

it("the option objects are readonly", () => {
  // @ts-expect-error maxFileSize is readonly
  defaultRichTextImageRules.maxFileSize = 1;
  // @ts-expect-error the list is a readonly array
  defaultRichTextImageRules.allowedMimeTypes.push("image/png");
  // @ts-expect-error tabSize is readonly
  richTextCodeBlockOptions.tabSize = 2;
  // @ts-expect-error the list is readonly
  richTextStyledSanitizeOptions.FORBID_TAGS.push("a");
  // @ts-expect-error the list is readonly
  richTextStyledSanitizeOptions.FORBID_ATTR.push("onclick");
  // @ts-expect-error the list is readonly
  richTextImageActions.push(richTextImageActions[0]);
});
