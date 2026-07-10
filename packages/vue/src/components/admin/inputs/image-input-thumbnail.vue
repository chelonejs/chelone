<script setup lang="ts">
/**
 * `<ImageInputThumbnail>` — the default per-file preview for `<ImageInput>`, the
 * Vue analog of `@chelone/react`'s internal `ImageInputThumbnail`. It reads the
 * ambient file record (`{ src, title }`) that `<FileInput>` publishes (via
 * {@link provideRecordContext}) and renders it as a thumbnail `<img>`. A stand-in
 * for a ported `<ImageField>` default child; pass an explicit slot to override.
 */

import { useRecordContext } from "../../../record/record-context";

// The file record is static per preview (published by <FileInputPreview>), so a
// single setup-time read suffices — parity with the React twin.
const record = useRecordContext<{ src?: string; title?: string }>();
</script>

<template>
  <img
    v-if="record?.src"
    :src="record.src"
    :title="record.title"
    :alt="record.title"
    class="h-24 w-24 rounded-md object-cover"
  />
</template>
