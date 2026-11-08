<script lang="ts">
import type { FileEntry } from "@chelone/core";

/** Props for {@link FileInputPreview}. */
export interface FileInputPreviewProps {
  /** The file record published to the preview slot (a transformed file or an existing record). */
  file: FileEntry;
}
</script>

<script setup lang="ts">
/**
 * `<FileInputPreview>` — the per-file preview row inside a `<FileInput>`, the Vue
 * analog of `@chelone/react`'s `FileInputPreview`. It publishes the file record
 * to its slot descendants via {@link provideRecordContext} (so a preview child —
 * a `<FileField>`, an `<img>`, etc. — reads `src`/`title` off the ambient
 * record) and renders a remove button. On teardown it revokes the object URL a
 * dropped file's preview held, matching the twin's cleanup effect.
 */

import { fileEntryPreview } from "@chelone/core";
import { onScopeDispose } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { provideRecordContext } from "../../../record/record-context";
import Button from "../../ui/button.vue";

const props = defineProps<FileInputPreviewProps>();
const emit = defineEmits<{ remove: [] }>();

const translate = useTranslate();

// Publish the file record so the preview slot reads its src/title.
provideRecordContext(props.file);

onScopeDispose(() => {
  const preview = fileEntryPreview(props.file);
  if (preview && typeof URL !== "undefined" && URL.revokeObjectURL) {
    URL.revokeObjectURL(preview);
  }
});
</script>

<template>
  <div data-slot="file-input-preview" class="group flex flex-row items-center gap-1">
    <Button
      type="button"
      variant="ghost"
      size="icon"
      class="size-6 rounded-full opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
      :aria-label="translate('chelone.action.delete', { _: 'Delete' })"
      :title="translate('chelone.action.delete', { _: 'Delete' })"
      @click="emit('remove')"
    >
      <span aria-hidden="true">×</span>
    </Button>
    <slot />
  </div>
</template>
