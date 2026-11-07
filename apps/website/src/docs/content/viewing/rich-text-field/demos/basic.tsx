import { RecordContextProvider } from "@chelone/react";
import { RichTextField } from "@chelone/react/rich-text-input";

export const mode = "record";

const body =
  "<h2>On Computable Numbers</h2><p>A <strong>number</strong> is computable when a machine can write its digits, one after another.</p><blockquote><p>The stored value is HTML, sanitized before it is shown.</p></blockquote>";

/** `<RichTextField>` shows a stored HTML body, sanitized with DOMPurify. */
export default function RichTextFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, body }}>
      <div className="w-full max-w-2xl">
        <RichTextField source="body" empty="No content" />
      </div>
    </RecordContextProvider>
  );
}
