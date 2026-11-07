import {
  BlockDocField,
  dataBlocks,
  defaultBlocks,
} from "@chelone/react/block-editor";

export const mode = "record";

const blocks = [...defaultBlocks, ...dataBlocks];

const record = {
  id: 1,
  body: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Release notes" }],
      },
      {
        type: "callout",
        attrs: { variant: "success" },
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Read-only: no toolbar, no Add block." },
            ],
          },
        ],
      },
      {
        type: "recordList",
        attrs: { resource: "posts", perPage: 3, fields: ["title", "views"] },
      },
    ],
  },
};

/** `<BlockDocField>` shows a stored document with its callout and record list drawn and nothing to edit. */
export default function BlockDocFieldDemo() {
  return (
    <div className="w-full max-w-2xl">
      <BlockDocField
        source="body"
        record={record}
        blocks={blocks}
        empty="No content"
        className="rounded-md border p-3"
      />
    </div>
  );
}
