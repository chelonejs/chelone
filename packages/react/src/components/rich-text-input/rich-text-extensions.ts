import { richTextStarterKitOptions } from "@chelone/core";
import type { Extensions } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";

// tiptap's `levels` is a mutable array, and core's options are frozen.
const starterKitOptions = {
  ...richTextStarterKitOptions,
  heading: { levels: [...richTextStarterKitOptions.heading.levels] },
};

/** The editor's default extensions: core's starter kit options, and a placeholder. */
export function createRichTextExtensions({
  placeholder,
}: {
  placeholder: string | (() => string);
}): Extensions {
  return [
    StarterKit.configure(starterKitOptions),
    Placeholder.configure({ placeholder }),
  ];
}
