/**
 * `<KeyboardShortcut>` — renders a keyboard shortcut as styled `<kbd>` glyphs.
 * Ported verbatim from shadmin `common/keyboard-shortcut.tsx` (no shadmin-core
 * seam — pure presentation). Used by `<MenuItemLink>` to render an item's
 * optional shortcut hint.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

const KeyMap: Record<string, string> = {
  meta: "⌘",
  mod: "⌘",
  ctrl: "⌃",
  shift: "⇧",
  alt: "⌥",
  enter: "⏎",
  esc: "⎋",
  escape: "⎋",
  backspace: "⌫",
  delete: "⌦",
  tab: "⇥",
  space: "␣",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  home: "↖",
  end: "↘",
  pageup: "⇞",
  pagedown: "⇟",
};

export interface KeyboardShortcutProps
  extends React.HTMLAttributes<HTMLDivElement> {
  keyboardShortcut?: string;
}

/**
 * Displays a keyboard shortcut using styled `<kbd>` elements.
 *
 * Accepts a shortcut string with `+` separating keys and `>` separating
 * sequential chords (e.g. `"mod+k"`, `"shift+ctrl+a>b"`). Renders nothing when
 * no shortcut is provided.
 *
 * @example
 * <KeyboardShortcut keyboardShortcut="mod+k" />
 */
function KeyboardShortcut({
  className,
  keyboardShortcut,
  ...rest
}: KeyboardShortcutProps) {
  if (!keyboardShortcut) {
    return null;
  }

  return (
    <div className={cn("opacity-70", className)} {...rest}>
      {keyboardShortcut.split(">").map((sequence, sequenceIndex, sequences) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: shortcut tokens are positional primitives that may repeat (e.g. "mod" twice); index disambiguates duplicates in a fixed split
        <React.Fragment key={`${sequence}-${sequenceIndex}`}>
          {sequence.split("+").map((key, keyIndex) => (
            <kbd
              // biome-ignore lint/suspicious/noArrayIndexKey: shortcut tokens are positional primitives that may repeat (e.g. "mod" twice); index disambiguates duplicates in a fixed split
              key={`${key}-${keyIndex}`}
              className="mx-px inline-block whitespace-nowrap rounded-md border border-border px-[5px] py-[4px] text-[11px] leading-[10px] text-foreground align-middle shadow-[inset_0_-1px_0_var(--border)]"
            >
              {KeyMap[key.toLowerCase()] ?? key.toUpperCase()}
            </kbd>
          ))}
          {sequenceIndex < sequences.length - 1 ? <>&nbsp;</> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export { KeyboardShortcut };
