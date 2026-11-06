import {
  isSafeLinkUrl,
  type RichTextToolbarItem,
  type RichTextToolbarItemId,
  richTextBlockTypes,
  richTextToolbarItems,
} from "@chelone/core";
import { type Editor, useCurrentEditor, useEditorState } from "@tiptap/react";
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  Redo2Icon,
  RemoveFormattingIcon,
  SquareCodeIcon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react";
import { type ComponentType, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";

interface ItemSpec {
  icon: ComponentType<{ className?: string }>;
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

const itemSpecs: Record<RichTextToolbarItemId, ItemSpec> = {
  bold: {
    icon: BoldIcon,
    active: "bold",
    run: (editor) => void editor.chain().focus().toggleBold().run(),
  },
  italic: {
    icon: ItalicIcon,
    active: "italic",
    run: (editor) => void editor.chain().focus().toggleItalic().run(),
  },
  underline: {
    icon: UnderlineIcon,
    active: "underline",
    run: (editor) => void editor.chain().focus().toggleUnderline().run(),
  },
  strike: {
    icon: StrikethroughIcon,
    active: "strike",
    run: (editor) => void editor.chain().focus().toggleStrike().run(),
  },
  code: {
    icon: CodeIcon,
    active: "code",
    run: (editor) => void editor.chain().focus().toggleCode().run(),
  },
  clearFormatting: {
    icon: RemoveFormattingIcon,
    run: (editor) =>
      void editor.chain().focus().unsetAllMarks().clearNodes().run(),
  },
  link: { icon: LinkIcon, active: "link" },
  bulletList: {
    icon: ListIcon,
    active: "bulletList",
    run: (editor) => void editor.chain().focus().toggleBulletList().run(),
  },
  orderedList: {
    icon: ListOrderedIcon,
    active: "orderedList",
    run: (editor) => void editor.chain().focus().toggleOrderedList().run(),
  },
  blockquote: {
    icon: QuoteIcon,
    active: "blockquote",
    run: (editor) => void editor.chain().focus().toggleBlockquote().run(),
  },
  codeBlock: {
    icon: SquareCodeIcon,
    active: "codeBlock",
    run: (editor) => void editor.chain().focus().toggleCodeBlock().run(),
  },
  horizontalRule: {
    icon: MinusIcon,
    run: (editor) => void editor.chain().focus().setHorizontalRule().run(),
  },
  undo: {
    icon: Undo2Icon,
    run: (editor) => void editor.chain().focus().undo().run(),
    canRun: (editor) => editor.can().undo(),
  },
  redo: {
    icon: Redo2Icon,
    run: (editor) => void editor.chain().focus().redo().run(),
    canRun: (editor) => editor.can().redo(),
  },
};

interface ButtonState {
  pressed: boolean | undefined;
  disabled: boolean;
}

interface ToolbarState {
  editable: boolean;
  /** One entry per `richTextToolbarItems` entry, in order. */
  buttons: ButtonState[];
  blockType: string;
}

function readToolbarState(editor: Editor): ToolbarState {
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

const isMac = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.userAgent);

/** `mod+shift+b` as `Ctrl+Shift+B`, or `⌘⇧B` on a Mac. */
function formatShortcut(shortcut: string): string {
  const mac = isMac();
  const names: Record<string, string> = mac
    ? { mod: "⌘", shift: "⇧", alt: "⌥" }
    : { mod: "Ctrl", shift: "Shift", alt: "Alt" };
  return shortcut
    .split("+")
    .map((part) => names[part] ?? part.toUpperCase())
    .join(mac ? "" : "+");
}

interface RichTextToolbarProps {
  className?: string;
}

/**
 * The formatting toolbar of `<RichTextInput>`: a block type select and one
 * button per formatting command. It reads the editor from tiptap's
 * `EditorContext`, so it works inside `<RichTextInput toolbar={...}>` and in
 * any tree that provides one.
 *
 * @example
 * import { RichTextInput, RichTextToolbar } from "@chelone/react/rich-text-input";
 *
 * <RichTextInput source="body" toolbar={<RichTextToolbar className="p-2" />} />
 */
function RichTextToolbar({ className }: RichTextToolbarProps) {
  const { editor } = useCurrentEditor();
  return editor ? <ToolbarBody editor={editor} className={className} /> : null;
}

function ToolbarBody({
  editor,
  className,
}: { editor: Editor } & RichTextToolbarProps) {
  const translate = useTranslate();
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => readToolbarState(e),
  });
  const [linkOpen, setLinkOpen] = useState(false);

  const groups = new Map<
    RichTextToolbarItem["group"],
    { item: RichTextToolbarItem; button: ButtonState }[]
  >();
  richTextToolbarItems.forEach((item, index) => {
    const button = state.buttons[index];
    if (!button) return;
    groups.set(item.group, [
      ...(groups.get(item.group) ?? []),
      { item, button },
    ]);
  });

  return (
    <div data-slot="rich-text-toolbar-root" className="border-b">
      <div
        role="toolbar"
        aria-label={translate("chelone.rich_text.toolbar", {
          _: "Formatting",
        })}
        data-slot="rich-text-toolbar"
        className={cn("flex flex-wrap items-center gap-1 p-1", className)}
      >
        <NativeSelect
          size="sm"
          aria-label={translate("chelone.rich_text.block_type", {
            _: "Block type",
          })}
          value={state.blockType}
          disabled={!state.editable}
          onChange={(event) => {
            const type = richTextBlockTypes.find(
              (candidate) => candidate.id === event.target.value,
            );
            if (!type) return;
            const chain = editor.chain().focus();
            if (type.level === undefined) chain.setParagraph().run();
            else chain.setHeading({ level: type.level }).run();
          }}
        >
          {richTextBlockTypes.map((type) => (
            <NativeSelectOption key={type.id} value={type.id}>
              {translate(type.labelKey, { _: type.defaultLabel })}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {[...groups].map(([group, entries]) => (
          <div key={group} className="flex items-center gap-1">
            <Separator orientation="vertical" className="mx-1 h-6" />
            {entries.map(({ item, button }) => (
              <ToolbarButton
                key={item.id}
                editor={editor}
                item={item}
                state={button}
                expanded={item.id === "link" ? linkOpen : undefined}
                onLink={() => setLinkOpen((open) => !open)}
              />
            ))}
          </div>
        ))}
      </div>
      {linkOpen ? (
        <LinkForm editor={editor} onClose={() => setLinkOpen(false)} />
      ) : null}
    </div>
  );
}

function ToolbarButton({
  editor,
  item,
  state,
  expanded,
  onLink,
}: {
  editor: Editor;
  item: RichTextToolbarItem;
  state: ButtonState;
  expanded: boolean | undefined;
  onLink: () => void;
}) {
  const translate = useTranslate();
  const spec = itemSpecs[item.id];
  const Icon = spec.icon;
  const label = translate(item.labelKey, { _: item.defaultLabel });
  const tooltip = item.shortcut
    ? `${label} (${formatShortcut(item.shortcut)})`
    : label;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={state.pressed ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label={label}
          aria-pressed={state.pressed}
          aria-expanded={expanded}
          disabled={state.disabled}
          // Keeps the editor's selection, which a button click would blur.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (spec.run ? spec.run(editor) : onLink())}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function LinkForm({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const translate = useTranslate();
  const [url, setUrl] = useState<string>(
    () => editor.getAttributes("link").href ?? "",
  );
  const [invalid, setInvalid] = useState(false);

  function apply() {
    const href = url.trim();
    if (href === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      onClose();
      return;
    }
    if (!isSafeLinkUrl(href)) {
      setInvalid(true);
      return;
    }
    const { empty } = editor.state.selection;
    if (empty && !editor.isActive("link")) {
      // Nothing is selected, so the link's text is its address.
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: href,
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    onClose();
  }

  function remove() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  }

  return (
    <div
      data-slot="rich-text-link-form"
      className="flex flex-wrap items-center gap-2 border-t p-2"
    >
      <Input
        type="text"
        className="h-8 min-w-48 flex-1"
        aria-label={translate("chelone.rich_text.link_url", { _: "URL" })}
        aria-invalid={invalid || undefined}
        value={url}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
        }}
        onChange={(event) => {
          setUrl(event.target.value);
          setInvalid(false);
        }}
      />
      <Button type="button" size="sm" onClick={apply}>
        {translate("chelone.rich_text.link_apply", { _: "Apply" })}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={remove}>
        {translate("chelone.rich_text.link_remove", { _: "Remove" })}
      </Button>
      {invalid ? (
        <p role="alert" className="w-full text-destructive text-xs">
          {translate("chelone.rich_text.invalid_url", {
            _: "Enter a web, mail or phone link",
          })}
        </p>
      ) : null}
    </div>
  );
}

export { RichTextToolbar, type RichTextToolbarProps };
