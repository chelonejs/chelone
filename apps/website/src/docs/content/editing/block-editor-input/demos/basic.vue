<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import {
  BlockEditorInput,
  dataBlocks,
  defaultBlocks,
} from "@chelone/vue/block-editor";

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
</script>

<template>
  <!-- `<BlockEditorInput>` edits a document of text, a callout and a live list of the seeded posts. -->
  <div class="w-full max-w-2xl">
    <BlockEditorInput
      source="body"
      label="Body"
      :blocks="blocks"
      :default-value="body"
      helper-text="Type / on an empty line to insert a block."
    />
  </div>
</template>
