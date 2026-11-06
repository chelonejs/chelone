import {
  type RichTextToolbarItemId,
  richTextBlockTypes,
  richTextToolbarItems,
} from "@chelone/core";
import type { Editor } from "@tiptap/core";

interface ItemSpec {
  /** The mark or node `editor.isActive` reads, for a button that reports `aria-pressed`. */
  active?:
    | "bold"
    | "italic"
    | "underline"
    | "strike"
    | "code"
    | "link"
    | "bulletList"
    | "orderedList"
    | "blockquote"
    | "codeBlock";
  /** Absent for Link, which opens the link form instead. */
  run?: (editor: Editor) => void;
  canRun?: (editor: Editor) => boolean;
}

export const itemSpecs: Record<RichTextToolbarItemId, ItemSpec> = {
  bold: {
    active: "bold",
    run: (editor) => void editor.chain().focus().toggleBold().run(),
  },
  italic: {
    active: "italic",
    run: (editor) => void editor.chain().focus().toggleItalic().run(),
  },
  underline: {
    active: "underline",
    run: (editor) => void editor.chain().focus().toggleUnderline().run(),
  },
  strike: {
    active: "strike",
    run: (editor) => void editor.chain().focus().toggleStrike().run(),
  },
  code: {
    active: "code",
    run: (editor) => void editor.chain().focus().toggleCode().run(),
  },
  clearFormatting: {
    run: (editor) =>
      void editor.chain().focus().unsetAllMarks().clearNodes().run(),
  },
  link: { active: "link" },
  bulletList: {
    active: "bulletList",
    run: (editor) => void editor.chain().focus().toggleBulletList().run(),
  },
  orderedList: {
    active: "orderedList",
    run: (editor) => void editor.chain().focus().toggleOrderedList().run(),
  },
  blockquote: {
    active: "blockquote",
    run: (editor) => void editor.chain().focus().toggleBlockquote().run(),
  },
  codeBlock: {
    active: "codeBlock",
    run: (editor) => void editor.chain().focus().toggleCodeBlock().run(),
  },
  horizontalRule: {
    run: (editor) => void editor.chain().focus().setHorizontalRule().run(),
  },
  undo: {
    run: (editor) => void editor.chain().focus().undo().run(),
    canRun: (editor) => editor.can().undo(),
  },
  redo: {
    run: (editor) => void editor.chain().focus().redo().run(),
    canRun: (editor) => editor.can().redo(),
  },
};

export interface ButtonState {
  pressed: boolean | undefined;
  disabled: boolean;
}

export interface ToolbarState {
  editable: boolean;
  /** One entry per `richTextToolbarItems` entry, in order. */
  buttons: ButtonState[];
  blockType: string;
}

export function readToolbarState(editor: Editor): ToolbarState {
  const editable = editor.isEditable;
  const buttons = richTextToolbarItems.map((item): ButtonState => {
    const spec = itemSpecs[item.id];
    return {
      pressed: spec.active ? editor.isActive(spec.active) : undefined,
      disabled: !editable || (spec.canRun ? !spec.canRun(editor) : false),
    };
  });
  const heading = richTextBlockTypes.find(
    (type) =>
      type.level !== undefined &&
      editor.isActive("heading", { level: type.level }),
  );
  return { editable, buttons, blockType: heading?.id ?? "paragraph" };
}

/** Applies a block type from the select: a paragraph or a heading level. */
export function setBlockType(editor: Editor, id: string): void {
  const type = richTextBlockTypes.find((candidate) => candidate.id === id);
  if (!type) return;
  const chain = editor.chain().focus();
  if (type.level === undefined) chain.setParagraph().run();
  else chain.setHeading({ level: type.level }).run();
}

const isMac = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.userAgent);

/** `mod+shift+b` as `Ctrl+Shift+B`, or `⌘⇧B` on a Mac. */
export function formatShortcut(shortcut: string): string {
  const mac = isMac();
  const names: Record<string, string> = mac
    ? { mod: "⌘", shift: "⇧", alt: "⌥" }
    : { mod: "Ctrl", shift: "Shift", alt: "Alt" };
  return shortcut
    .split("+")
    .map((part) => names[part] ?? part.toUpperCase())
    .join(mac ? "" : "+");
}

/** Whether the editor has the color extension, which adds the toolbar's Text color button. */
export function hasRichTextColor(editor: Editor): boolean {
  return editor.extensionManager.extensions.some(
    (extension) => extension.name === "color",
  );
}

/** The color at the selection, as stored: a palette `var(...)`, or `null` for none. */
export function currentRichTextColor(editor: Editor): string | null {
  const { color } = editor.getAttributes("textStyle");
  return typeof color === "string" ? color : null;
}
