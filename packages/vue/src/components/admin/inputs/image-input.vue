<script lang="ts">
import type { FileInputProps } from "./file-input.vue";

/** Props for {@link ImageInput} — the {@link FileInputProps} surface. */
export type ImageInputProps = FileInputProps;
</script>

<script setup lang="ts">
/**
 * `<ImageInput>` — an image-upload input with thumbnail previews, the Vue analog
 * of `@chelone/react`'s `inputs/image-input.tsx`. A thin wrapper around
 * {@link FileInput} that defaults `accept` to `"image/*"` and, when no preview
 * slot is supplied, renders an inline `<img>` thumbnail per file
 * ({@link ImageInputThumbnail}, reading the per-file ambient record).
 *
 * Divergence note (inherited from `<FileInput>`): the drop UI is native
 * drag-drop, not react-dropzone; `accept` is the native string form.
 */

import { computed } from "vue";
import FileInput from "./file-input.vue";
import ImageInputThumbnail from "./image-input-thumbnail.vue";

// `label: undefined` stops Vue casting an absent `string | false` to `false`,
// which would hide the label <FileInput> falls back to.
const props = withDefaults(defineProps<ImageInputProps>(), {
  label: undefined,
  accept: "image/*",
  labelMultiple: "chelone.input.image.upload_several",
  labelSingle: "chelone.input.image.upload_single",
});

// Forward every prop to <FileInput> (accept/labels already defaulted above).
const fileProps = computed(() => ({ ...props }));
</script>

<template>
  <FileInput v-bind="fileProps">
    <template #default="{ record }">
      <slot :record="record">
        <ImageInputThumbnail />
      </slot>
    </template>
  </FileInput>
</template>
