/** The slice of a `KeyboardEvent` the matcher reads, so core needs no DOM types. */
export interface HotkeyEvent {
  key: string;
  /**
   * The physical key (`KeyboardEvent.code`). Optional. When present it settles
   * chords whose `key` the modifier rewrote: Option+/ is `"÷"` on macOS and
   * Shift+1 is `"!"` on a US layout.
   */
  code?: string;
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
  const lower = binding.toLowerCase();
  // A trailing "+" is the plus key itself: "mod++" is mod and "+".
  const plus = lower === "+" || lower.endsWith("++");
  const parts = (plus ? lower.slice(0, -1) : lower).split("+");
  const key = plus ? "+" : (parts.pop() ?? "");
  return {
    key,
    mod: parts.includes("mod"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
  };
}

const punctuationCodes: Record<string, string> = {
  "/": "Slash",
  ".": "Period",
  ",": "Comma",
  ";": "Semicolon",
  "'": "Quote",
  "[": "BracketLeft",
  "]": "BracketRight",
  "\\": "Backslash",
  "-": "Minus",
  "=": "Equal",
  "`": "Backquote",
};

function codeFor(key: string): string | undefined {
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  return punctuationCodes[key];
}

/**
 * Option and Shift rewrite `event.key` ("÷" for Option+/, "!" for Shift+1), so
 * a chord with either falls back to the physical key, but only when `key` is
 * not already a letter or digit. On a Dvorak layout the physical K key types
 * "t": that stays a "t", so `mod+k` does not fire on it.
 */
function keyMatches(
  event: HotkeyEvent,
  parsed: ParsedBinding,
  eventKey: string,
): boolean {
  if (eventKey === parsed.key) return true;
  if (!(parsed.alt || parsed.shift) || !event.code) return false;
  if (/^[a-z0-9]$/i.test(event.key)) return false;
  return event.code === codeFor(parsed.key);
}

/**
 * Reads bindings such as `"mod+k"`, `"mod+shift+p"`, `"alt+/"` and `"f1"`.
 * `mod` is Meta or Ctrl. Modifiers match exactly: a binding without `mod`
 * does not fire while Ctrl or Meta is down.
 */
export function matchesHotkey(event: HotkeyEvent, binding: string): boolean {
  const parsed = parseBinding(binding);
  if (!keyMatches(event, parsed, event.key.toLowerCase())) return false;
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
