<script setup lang="ts">
/**
 * `<PageEdit>` — the page edit page, the Vue twin of `apps/demo`'s `PageEdit`.
 * The body is HTML in a `<RichTextInput>` and the release notes are markdown in
 * an `<MdxInput>`; both add-ons come from their subpaths.
 */

import { Edit, TextInput, Toolbar } from "@chelone/vue";
import { MdxInput } from "@chelone/vue/mdx-editor";
import { RichTextInput } from "@chelone/vue/rich-text-input";
</script>

<template>
  <Edit resource="pages">
    <div class="flex flex-col gap-4 max-w-4xl">
      <TextInput source="title" />
      <TextInput source="slug" />
      <RichTextInput source="body" label="Body" />
      <MdxInput source="release_notes" label="Release notes" />
    </div>
    <Toolbar />
  </Edit>
</template>
