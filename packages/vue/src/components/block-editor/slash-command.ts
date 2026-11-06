import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionProps } from "@tiptap/suggestion";

/** What the editor shell hears from the slash trigger. */
export interface SlashCallbacks {
  /** The `/` was typed, or the text after it changed. */
  onChange: (props: SuggestionProps) => void;
  /** The suggestion ended: a space, a deleted `/`, Escape or a click away. */
  onClose: () => void;
  /** Return true to take the key. */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/** Reports `/` and the text after it to `callbacks`, which belong to one editor. */
export function createSlashExtension({
  onChange,
  onClose,
  onKeyDown,
}: SlashCallbacks): Extension {
  return Extension.create({
    name: "blockSlash",
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: "/",
          pluginKey: new PluginKey("blockSlash"),
          render: () => ({
            onStart: onChange,
            onUpdate: onChange,
            onExit: onClose,
            onKeyDown: ({ event }) => onKeyDown(event),
          }),
        }),
      ];
    },
  });
}
