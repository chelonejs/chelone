import { MdxInput } from "@chelone/react/mdx-editor";
import "@mdxeditor/editor/style.css";

export const mode = "input";

const notes =
  "## What changed\n\n- Rewrote the introduction\n- Added a **list** of the main points\n\nSee the [archive](https://example.com).";

/** `<MdxInput>` edits a markdown string, so release notes stay plain text. */
export default function MdxInputDemo() {
  return (
    <div className="w-full max-w-2xl">
      <MdxInput source="body" label="Release notes" defaultValue={notes} />
    </div>
  );
}
