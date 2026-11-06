import type { BlockAttrs, BlockRegistry } from "@chelone/core";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection, type Transaction } from "@tiptap/pm/state";
import { useEditorState } from "@tiptap/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslate } from "../../i18n-hooks";
import { AutoConfigForm } from "./auto-config-form";
import {
  type BlockConfigProps,
  type BlockDefinition,
  translateBlock,
} from "./block-nodes";

interface SelectedBlock {
  name: string;
  /** Where the block starts in the document. */
  pos: number;
  index: number;
  count: number;
  attrs: BlockAttrs;
}

/** The selected block, else the nearest registered block around the caret. */
function selectedBlock(
  editor: Editor,
  registry: BlockRegistry<BlockDefinition>,
): SelectedBlock | null {
  const { selection } = editor.state;
  const { $from } = selection;
  if (
    selection instanceof NodeSelection &&
    registry.get(selection.node.type.name)
  ) {
    return {
      name: selection.node.type.name,
      pos: selection.from,
      index: $from.index(),
      count: $from.parent.childCount,
      attrs: selection.node.attrs,
    };
  }
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (registry.get(node.type.name)) {
      return {
        name: node.type.name,
        pos: $from.before(depth),
        index: $from.index(depth - 1),
        count: $from.node(depth - 1).childCount,
        attrs: node.attrs,
      };
    }
  }
  return null;
}

function runOnBlock(
  editor: Editor,
  pos: number,
  act: (tr: Transaction, block: ProseMirrorNode) => void,
  { focus = true }: { focus?: boolean } = {},
) {
  const block = editor.state.doc.nodeAt(pos);
  if (!block) return;
  const { tr } = editor.state;
  act(tr, block);
  editor.view.dispatch(tr.scrollIntoView());
  // A config field keeps the focus, or the next keystroke would land in the editor and replace the selected block.
  if (focus) editor.view.focus();
}

function ToolbarButton({
  label,
  disabled,
  pressed,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={pressed ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ConfigPanel({
  definition,
  attrs,
  onChange,
}: {
  definition: BlockDefinition;
} & BlockConfigProps) {
  const { config: Config } = definition;
  if (Config === undefined) return null;
  if (Config === "auto") {
    return (
      <AutoConfigForm
        schema={definition.schema}
        attrs={attrs}
        onChange={onChange}
      />
    );
  }
  return <Config attrs={attrs} onChange={onChange} />;
}

export interface BlockToolbarProps {
  editor: Editor;
  registry: BlockRegistry<BlockDefinition>;
}

/**
 * A bar above the document for the block that is selected or holds the caret:
 * configure, duplicate, move and delete. Configure opens a panel under the bar.
 */
export function BlockToolbar({ editor, registry }: BlockToolbarProps) {
  const translate = useTranslate();
  // The block the panel is open for, so it does not open itself on another one.
  const [configFor, setConfigFor] = useState<string | null>(null);
  const selected = useEditorState({
    editor,
    selector: ({ editor: current }) => selectedBlock(current, registry),
  });
  const hasSelection = selected !== null;
  useEffect(() => {
    if (!hasSelection) setConfigFor(null);
  }, [hasSelection]);
  const definition = selected ? registry.get(selected.name) : undefined;
  if (!selected || !definition) return null;

  const { pos } = selected;
  const duplicate = () =>
    runOnBlock(editor, pos, (tr, block) => {
      const end = pos + block.nodeSize;
      tr.insert(end, block);
      tr.setSelection(NodeSelection.create(tr.doc, end));
    });
  const remove = () =>
    runOnBlock(editor, pos, (tr, block) => {
      tr.delete(pos, pos + block.nodeSize);
    });
  const moveUp = () =>
    runOnBlock(editor, pos, (tr, block) => {
      const before = tr.doc.resolve(pos).nodeBefore;
      if (!before) return;
      const start = pos - before.nodeSize;
      tr.replaceWith(start, pos + block.nodeSize, [block, before]);
      tr.setSelection(NodeSelection.create(tr.doc, start));
    });
  const moveDown = () =>
    runOnBlock(editor, pos, (tr, block) => {
      const end = pos + block.nodeSize;
      const after = tr.doc.resolve(end).nodeAfter;
      if (!after) return;
      tr.replaceWith(pos, end + after.nodeSize, [after, block]);
      tr.setSelection(NodeSelection.create(tr.doc, pos + after.nodeSize));
    });
  const patch = (attrs: Partial<BlockAttrs>) =>
    runOnBlock(
      editor,
      pos,
      (tr, block) => {
        tr.setNodeMarkup(pos, undefined, { ...block.attrs, ...attrs });
      },
      { focus: false },
    );

  const configOpen = configFor === selected.name;
  const { config } = definition;
  const hasConfig = config !== undefined;
  return (
    <>
      <div
        role="toolbar"
        data-slot="block-toolbar"
        aria-label={translate("chelone.block_editor.toolbar.label", {
          _: "Block actions",
        })}
        className="flex items-center gap-1 border-b p-1"
      >
        <span className="px-2 text-muted-foreground text-xs">
          {translateBlock(translate, definition).label}
        </span>
        {hasConfig ? (
          <ToolbarButton
            label={translate("chelone.block_editor.toolbar.configure", {
              _: "Configure",
            })}
            pressed={configOpen}
            onClick={() => setConfigFor(configOpen ? null : selected.name)}
          >
            <SettingsIcon />
          </ToolbarButton>
        ) : null}
        <ToolbarButton
          label={translate("chelone.block_editor.toolbar.duplicate", {
            _: "Duplicate",
          })}
          onClick={duplicate}
        >
          <CopyIcon />
        </ToolbarButton>
        <ToolbarButton
          label={translate("chelone.block_editor.toolbar.move_up", {
            _: "Move up",
          })}
          disabled={selected.index === 0}
          onClick={moveUp}
        >
          <ArrowUpIcon />
        </ToolbarButton>
        <ToolbarButton
          label={translate("chelone.block_editor.toolbar.move_down", {
            _: "Move down",
          })}
          disabled={selected.index === selected.count - 1}
          onClick={moveDown}
        >
          <ArrowDownIcon />
        </ToolbarButton>
        <ToolbarButton
          label={translate("chelone.block_editor.toolbar.delete", {
            _: "Delete",
          })}
          onClick={remove}
        >
          <Trash2Icon />
        </ToolbarButton>
      </div>
      {hasConfig && configOpen ? (
        <div data-slot="block-config" className="border-b p-3">
          <ConfigPanel
            definition={definition}
            attrs={selected.attrs}
            onChange={patch}
          />
        </div>
      ) : null}
    </>
  );
}
