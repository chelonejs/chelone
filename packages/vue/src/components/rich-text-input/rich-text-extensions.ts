import {
  endColorOnEnter,
  richTextCodeBlockOptions,
  richTextStarterKitOptions,
} from "@chelone/core";
import { Extension } from "@tiptap/core";
import type { CodeBlockOptions } from "@tiptap/extension-code-block";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Plugin } from "@tiptap/pm/state";
import type { LanguageFn } from "highlight.js";
import { common, createLowlight } from "lowlight";

export { Color, TextStyle } from "@tiptap/extension-text-style";

// tiptap's `levels` is a mutable array, and core's options are frozen.
export const starterKitOptions = {
  ...richTextStarterKitOptions,
  heading: { levels: [...richTextStarterKitOptions.heading.levels] },
};

// lowlight highlights with highlight.js grammars; `common` is its default set of 37.
const grammars: Record<string, LanguageFn> = common;
const lowlight = createLowlight(grammars);

export const codeBlockOptions: Partial<CodeBlockOptions> =
  richTextCodeBlockOptions;

/** CodeBlockLowlight replaces the starter kit's code block. */
export const HighlightedCodeBlock = CodeBlockLowlight.configure({
  ...codeBlockOptions,
  lowlight,
});

/** A color ends with the line it was set on; see core's `endColorOnEnter`. */
export const EndColorOnEnter = Extension.create({
  name: "endColorOnEnter",
  priority: 1000,
  addProseMirrorPlugins: () => {
    const hooks = endColorOnEnter();
    return [
      new Plugin({
        props: { handleKeyDown: hooks.handleKeyDown },
        appendTransaction: hooks.appendTransaction,
      }),
    ];
  },
});
