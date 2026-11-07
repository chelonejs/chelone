import { RichTextInput } from "@chelone/react/rich-text-input";

export const mode = "input";

const body =
  "<h2>On Computable Numbers</h2><p>A <strong>number</strong> is computable when a machine can write its digits, one after another.</p><ul><li>Select text to format it</li><li>Use the toolbar for headings, lists and links</li></ul>";

/** `<RichTextInput>` edits an HTML body in a tiptap editor with a toolbar. */
export default function RichTextInputDemo() {
  return (
    <div className="w-full max-w-2xl">
      <RichTextInput source="body" label="Body" defaultValue={body} />
    </div>
  );
}
