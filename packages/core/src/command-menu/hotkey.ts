/** The slice of a `KeyboardEvent` the matcher reads, so core needs no DOM types. */
export interface HotkeyEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  isComposing?: boolean;
}

/** The slice of an `EventTarget` that says whether the user is typing in it. */
export interface HotkeyTarget {
  tagName?: string;
  isContentEditable?: boolean;
}

interface ParsedBinding {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
}

function parseBinding(binding: string): ParsedBinding {
  const parts = binding.toLowerCase().split("+");
  const key = parts.pop() ?? "";
  return {
    key,
    mod: parts.includes("mod"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
  };
}

/**
 * Reads bindings such as `"mod+k"`, `"mod+shift+p"`, `"alt+/"` and `"f1"`.
 * `mod` is Meta or Ctrl. Modifiers match exactly: a binding without `mod`
 * does not fire while Ctrl or Meta is down.
 */
export function matchesHotkey(event: HotkeyEvent, binding: string): boolean {
  const parsed = parseBinding(binding);
  if (event.key.toLowerCase() !== parsed.key) return false;
  const modDown = event.metaKey || event.ctrlKey;
  return (
    modDown === parsed.mod &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt
  );
}

export function isTypingTarget(
  target: HotkeyTarget | null | undefined,
): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

/**
 * `matchesHotkey` plus two guards: nothing fires during IME composition, and a
 * binding with neither `mod` nor `alt` is ignored while `target` is typing, so
 * `/` never opens the menu from a text field.
 */
export function shouldHandleHotkey(
  event: HotkeyEvent,
  binding: string,
  target: HotkeyTarget | null | undefined,
): boolean {
  if (event.isComposing) return false;
  if (!matchesHotkey(event, binding)) return false;
  const { mod, alt } = parseBinding(binding);
  if (!mod && !alt && isTypingTarget(target)) return false;
  return true;
}
