<script lang="ts">
/** Props for {@link KeyboardShortcut}. */
export interface KeyboardShortcutProps {
  /**
   * A shortcut string with `+` separating simultaneous keys and `>` separating
   * sequential chords (e.g. `"mod+k"`, `"shift+ctrl+a>b"`). Known key names map
   * to glyphs (`mod`/`meta` → `⌘`, `shift` → `⇧`, …); unknown keys uppercase.
   * Renders nothing when empty/absent.
   */
  keyboardShortcut?: string;
  /** Extra CSS class appended to the wrapper. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<KeyboardShortcut>` — renders a keyboard shortcut as styled `<kbd>` glyphs.
 * The Vue twin of `@chelone/react`'s `common/keyboard-shortcut.tsx` (pure
 * presentation, no core seam). Used to render a menu item's optional shortcut
 * hint.
 *
 * @example
 * <KeyboardShortcut keyboardShortcut="mod+k" />
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";

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

const props = defineProps<KeyboardShortcutProps>();

/** Parse `"shift+a>b"` into `[["⇧","A"],["B"]]` — chords of glyph tokens. */
const sequences = computed<string[][]>(() => {
  if (!props.keyboardShortcut) return [];
  return props.keyboardShortcut
    .split(">")
    .map((sequence) =>
      sequence
        .split("+")
        .map((key) => KeyMap[key.toLowerCase()] ?? key.toUpperCase()),
    );
});

const wrapperClass = computed(() => cn("opacity-70", props.class));
</script>

<template>
  <div v-if="sequences.length > 0" :class="wrapperClass">
    <template v-for="(sequence, sequenceIndex) in sequences" :key="sequenceIndex">
      <kbd
        v-for="(glyph, keyIndex) in sequence"
        :key="keyIndex"
        class="mx-px inline-block whitespace-nowrap rounded-md border border-border px-[5px] py-[4px] text-[11px] leading-[10px] text-foreground align-middle shadow-[inset_0_-1px_0_var(--border)]"
        >{{ glyph }}</kbd
      >
      <template v-if="sequenceIndex < sequences.length - 1">&nbsp;</template>
    </template>
  </div>
</template>
