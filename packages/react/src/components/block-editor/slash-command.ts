import { type Editor, Extension, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";
import type { RefObject } from "react";

export interface SlashState {
  query: string;
  range: Range;
  clientRect: (() => DOMRect | null) | null;
}

/** What the editor shell hears from the slash trigger; held in a ref per editor. */
export interface SlashCallbacks {
  /** The `/` was typed, or the query changed. */
  onChange: (state: SlashState) => void;
  /** The suggestion ended: a space, a deleted `/`, Escape or a click away. */
  onClose: () => void;
  /** Return true to take the key. */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const toState = ({
  query,
  range,
  clientRect,
}: SuggestionProps): SlashState => ({
  query,
  range,
  clientRect: clientRect ?? null,
});

/**
 * Reports `/` and the text after it. The callbacks are read from `callbacks`
 * on each event, so two editors on a page share nothing.
 */
export function createSlashExtension(
  callbacks: RefObject<SlashCallbacks | null>,
): Extension {
  return Extension.create({
    name: "blockSlash",
    addProseMirrorPlugins() {
      const editor: Editor = this.editor;
      return [
        Suggestion({
          editor,
          char: "/",
          pluginKey: new PluginKey("blockSlash"),
          render: () => ({
            onStart: (props) => callbacks.current?.onChange(toState(props)),
            onUpdate: (props) => callbacks.current?.onChange(toState(props)),
            onExit: () => callbacks.current?.onClose(),
            onKeyDown: ({ event }) =>
              callbacks.current?.onKeyDown(event) ?? false,
          }),
        }),
      ];
    },
  });
}
