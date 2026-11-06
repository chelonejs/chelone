import {
  richTextCodeBlockOptions,
  richTextStarterKitOptions,
} from "@chelone/core";
import { Extension, type Extensions } from "@tiptap/core";
import type { CodeBlockOptions } from "@tiptap/extension-code-block";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import type { LanguageFn } from "highlight.js";
import { common, createLowlight } from "lowlight";
import { RichTextImage, type RichTextImageConfig } from "./rich-text-image";

// tiptap's `levels` is a mutable array, and core's options are frozen.
const starterKitOptions = {
  ...richTextStarterKitOptions,
  heading: { levels: [...richTextStarterKitOptions.heading.levels] },
};

// lowlight highlights with highlight.js grammars; `common` is its default set of 37.
const grammars: Record<string, LanguageFn> = common;
const lowlight = createLowlight(grammars);

const codeBlockOptions: Partial<CodeBlockOptions> = richTextCodeBlockOptions;

/**
 * Splitting a block would carry the color into the next line, so a color ends
 * with the line it was set on. It runs before the keymap, which handles Enter.
 */
const EndColorOnEnter = Extension.create({
  name: "endColorOnEnter",
  priority: 1000,
  addProseMirrorPlugins() {
    let enterPressed = false;
    return [
      new Plugin({
        key: new PluginKey("endColorOnEnter"),
        props: {
          handleKeyDown: (_view, event) => {
            enterPressed =
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey;
            return false;
          },
        },
        appendTransaction: (transactions, _old, state) => {
          if (!enterPressed || !transactions.some((tr) => tr.docChanged)) {
            return null;
          }
          enterPressed = false;
          const marks = state.storedMarks ?? state.selection.$from.marks();
          const kept = marks.filter((mark) => mark.type.name !== "textStyle");
          return kept.length === marks.length
            ? null
            : state.tr.setStoredMarks(kept);
        },
      }),
    ];
  },
});

/**
 * The editor's default extensions: core's starter kit options, a placeholder,
 * images when `images` is given, text color when `colors` is on, and
 * highlighted code blocks when `codeHighlight` is on. `images` is read on every
 * use, so new settings need no new editor.
 */
export function createRichTextExtensions({
  placeholder,
  images,
  colors,
  codeHighlight,
}: {
  placeholder: string | (() => string);
  images: (() => RichTextImageConfig) | null;
  colors: boolean;
  codeHighlight: boolean;
}): Extensions {
  return [
    StarterKit.configure({
      ...starterKitOptions,
      // CodeBlockLowlight replaces it.
      codeBlock: codeHighlight ? false : codeBlockOptions,
    }),
    Placeholder.configure({ placeholder }),
    ...(images ? [RichTextImage.configure({ config: images })] : []),
    ...(colors ? [TextStyle, Color, EndColorOnEnter] : []),
    ...(codeHighlight
      ? [CodeBlockLowlight.configure({ ...codeBlockOptions, lowlight })]
      : []),
  ];
}
