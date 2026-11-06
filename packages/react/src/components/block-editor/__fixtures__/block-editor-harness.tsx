import type { BlockDocNode } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { act, screen } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import {
  type MountOptions,
  mountUnderForm,
} from "../../rich-text-input/__fixtures__/rich-text-harness";
import {
  BlockEditorInput,
  type BlockEditorInputProps,
} from "../block-editor-input";

/** ProseMirror measures the DOM while it scrolls the selection into view, which jsdom has no layout for. */
export function stubLayout() {
  const rect = new DOMRect(0, 0, 0, 0);
  const rects = Object.assign([], { item: () => null });
  Range.prototype.getClientRects = () => rects;
  Range.prototype.getBoundingClientRect = () => rect;
  Element.prototype.getClientRects = () => rects;
  document.elementFromPoint = () => null;
}

export const paragraph = (text: string): BlockDocNode => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

export const doc = (...content: BlockDocNode[]): BlockDocNode => ({
  type: "doc",
  content,
});

export interface Values {
  // `BlockDocNode` is recursive, which form-core's path types cannot follow.
  body: object | null;
}

/** tiptap leaves its editor on the ProseMirror element. */
export function editorOf(element: Element): Editor {
  const editor = Object.getOwnPropertyDescriptor(element, "editor")?.value;
  if (!(editor instanceof Editor))
    throw new Error("No tiptap editor on the element");
  return editor;
}

export async function mountBlockEditor(
  props: Partial<BlockEditorInputProps> = {},
  options: MountOptions<Values> = { defaultValues: { body: null } },
) {
  const mounted = mountUnderForm<Values>(
    <BlockEditorInput source="body" {...props} />,
    options,
  );
  const textbox = await screen.findByRole("textbox");
  return {
    ...mounted,
    dom: () => elementOf(textbox, HTMLElement),
    editor: () => editorOf(textbox),
    submit: () =>
      act(async () => {
        await mounted.form().submit();
      }),
  };
}
