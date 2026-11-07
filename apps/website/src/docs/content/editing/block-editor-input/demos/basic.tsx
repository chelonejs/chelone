import {
  BlockEditorInput,
  dataBlocks,
  defaultBlocks,
} from "@chelone/react/block-editor";

export const mode = "input";

const blocks = [...defaultBlocks, ...dataBlocks];

const body = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Release notes" }],
    },
    {
      type: "callout",
      attrs: { variant: "info" },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Type / on an empty line to add a block." },
          ],
        },
      ],
    },
    {
      type: "recordList",
      attrs: { resource: "posts", perPage: 3, fields: ["title", "views"] },
    },
  ],
};

/** `<BlockEditorInput>` edits a document of text, a callout and a live list of the seeded posts. */
export default function BlockEditorInputDemo() {
  return (
    <div className="w-full max-w-2xl">
      <BlockEditorInput
        source="body"
        label="Body"
        blocks={blocks}
        defaultValue={body}
        helperText="Type / on an empty line to insert a block."
      />
    </div>
  );
}
