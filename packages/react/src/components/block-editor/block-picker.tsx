import { matchBlocks } from "@chelone/core";
import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useTranslate } from "../../i18n-hooks";
import { type BlockDefinition, translateBlock } from "./block-nodes";

export interface BlockPickerProps {
  blocks: readonly BlockDefinition[];
  query: string;
  /** Shows a search box that edits `query`. The slash menu has none: the editor holds the text. */
  onQueryChange?: (query: string) => void;
  anchor: () => DOMRect | null;
  onSelect: (block: BlockDefinition) => void;
  onClose: () => void;
  /** The picker puts its handler for the editor's arrow, Enter and Escape keys here. */
  keyHandlerRef: MutableRefObject<((event: KeyboardEvent) => boolean) | null>;
}

function groupBlocks(blocks: readonly BlockDefinition[]) {
  const groups = new Map<string, BlockDefinition[]>();
  for (const block of blocks) {
    groups.set(block.group, [...(groups.get(block.group) ?? []), block]);
  }
  return [...groups];
}

/** The block menu, placed at a client rect, listing the blocks that match `query` by group. */
export function BlockPicker({
  blocks,
  query,
  onQueryChange,
  anchor,
  onSelect,
  onClose,
  keyHandlerRef,
}: BlockPickerProps) {
  const translate = useTranslate();
  // Searching reads the words the user sees, so it matches the translated copy.
  const matches = matchBlocks(
    blocks.map((block) => translateBlock(translate, block)),
    query,
  );
  const [highlighted, setHighlighted] = useState("");
  const active = matches.some((block) => block.name === highlighted)
    ? highlighted
    : (matches[0]?.name ?? "");
  const rootRef = useRef<HTMLDivElement>(null);

  keyHandlerRef.current = (event) => {
    const index = matches.findIndex((block) => block.name === active);
    const step = (delta: number) => {
      const next = matches[(index + delta + matches.length) % matches.length];
      if (next) setHighlighted(next.name);
    };
    if (event.key === "ArrowDown") step(1);
    else if (event.key === "ArrowUp") step(-1);
    else if (event.key === "Enter") {
      const chosen = matches[index];
      if (!chosen) return false;
      onSelect(chosen);
    } else return false;
    return true;
  };

  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (rootRef.current?.contains(target)) return;
      // The add button toggles the picker itself.
      if (target.closest('[data-slot="block-editor-add"]')) return;
      onClose();
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [onClose]);

  // The slash menu must not take focus from the editor that holds its query.
  const hasSearch = onQueryChange !== undefined;
  useEffect(() => {
    const root = rootRef.current;
    if (hasSearch || !root) return;
    const keepFocus = (event: MouseEvent) => event.preventDefault();
    root.addEventListener("mousedown", keepFocus);
    return () => root.removeEventListener("mousedown", keepFocus);
  }, [hasSearch]);

  const rect = anchor();
  return createPortal(
    <div
      ref={rootRef}
      data-slot="block-editor-picker"
      className="w-72 rounded-md border bg-popover shadow-md"
      style={{
        position: "fixed",
        left: rect?.left ?? 0,
        top: (rect?.bottom ?? 0) + 4,
        zIndex: 50,
      }}
    >
      <Command
        shouldFilter={false}
        value={active}
        onValueChange={setHighlighted}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        {onQueryChange ? (
          <CommandInput
            autoFocus
            value={query}
            onValueChange={onQueryChange}
            placeholder={translate("chelone.block_editor.search", {
              _: "Search blocks",
            })}
          />
        ) : null}
        <CommandList>
          <CommandEmpty>
            {translate("chelone.block_editor.no_blocks", {
              _: "No blocks found",
            })}
          </CommandEmpty>
          {groupBlocks(matches).map(([group, members]) => (
            <CommandGroup key={group} heading={group}>
              {members.map((block) => (
                <CommandItem
                  key={block.name}
                  value={block.name}
                  onSelect={() => onSelect(block)}
                >
                  {block.icon ? <block.icon className="size-4" /> : null}
                  <span className="flex flex-col">
                    <span>{block.label}</span>
                    {block.description ? (
                      <span className="text-muted-foreground text-xs">
                        {block.description}
                      </span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </div>,
    document.body,
  );
}
