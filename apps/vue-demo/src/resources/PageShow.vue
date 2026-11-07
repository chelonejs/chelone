<script setup lang="ts">
/**
 * `<PageShow>` — the read-only page, the Vue twin of `apps/demo`'s `PageShow`.
 * The body renders through a `<RichTextField>` (sanitized HTML) and the release
 * notes through an `<MdxField>` (a read-only Crepe editor).
 */

import { RecordField, Show } from "@chelone/vue";
import { MdxField } from "@chelone/vue/mdx-editor";
import { RichTextField } from "@chelone/vue/rich-text-input";
</script>

<template>
  <Show resource="pages">
    <div class="flex flex-col gap-4 max-w-4xl">
      <RecordField source="title" />
      <RecordField label="Body">
        <RichTextField source="body" empty="No content" />
      </RecordField>
      <RecordField label="Release notes">
        <MdxField source="release_notes" empty="No release notes" />
      </RecordField>
    </div>
  </Show>
</template>
