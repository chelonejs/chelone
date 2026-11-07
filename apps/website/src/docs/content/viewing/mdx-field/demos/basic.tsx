import { RecordContextProvider } from "@chelone/react";
import { MdxField } from "@chelone/react/mdx-editor";
import "@mdxeditor/editor/style.css";

export const mode = "record";

const notes =
  "## What changed\n\n- Rewrote the introduction\n- Added a **list** of the main points\n\n| Section | Change |\n| --- | --- |\n| Intro | Rewritten |";

/** `<MdxField>` shows a markdown value as formatted text in a read-only editor. */
export default function MdxFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, notes }}>
      <div className="w-full max-w-2xl">
        <MdxField source="notes" empty="No release notes" />
      </div>
    </RecordContextProvider>
  );
}
