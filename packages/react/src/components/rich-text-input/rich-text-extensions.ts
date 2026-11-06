import { richTextStarterKitOptions } from "@chelone/core";
import type { Extensions } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { RichTextImage, type RichTextImageConfig } from "./rich-text-image";

// tiptap's `levels` is a mutable array, and core's options are frozen.
const starterKitOptions = {
  ...richTextStarterKitOptions,
  heading: { levels: [...richTextStarterKitOptions.heading.levels] },
};

/**
 * The editor's default extensions: core's starter kit options, a placeholder,
 * and images when `images` is given. `images` is read on every use, so new
 * settings need no new editor.
 */
export function createRichTextExtensions({
  placeholder,
  images,
}: {
  placeholder: string | (() => string);
  images: (() => RichTextImageConfig) | null;
}): Extensions {
  return [
    StarterKit.configure(starterKitOptions),
    Placeholder.configure({ placeholder }),
    ...(images ? [RichTextImage.configure({ config: images })] : []),
  ];
}
