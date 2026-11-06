<script setup lang="ts">
import { isSafeImageSrc } from "@chelone/core";
import type { Editor } from "@tiptap/core";
import { ref, useTemplateRef } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import Button from "../ui/button.vue";
import Input from "../ui/input.vue";

import { getRichTextImageConfig } from "./rich-text-image";

const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const props = defineProps<{ editor: Editor }>();
const emit = defineEmits<{ close: [] }>();
const translate = useTranslate();
const url = ref("");
const invalid = ref(false);

function apply() {
  const src = url.value.trim();
  if (!src) return;
  if (!isSafeImageSrc(src, { allowDataImages: getRichTextImageConfig(props.editor)?.rules.allowBase64 ?? false })) {
    invalid.value = true;
    return;
  }
  props.editor.chain().focus().setImages([{ src }]).run();
  emit("close");
}
function choose(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return;
  const files = Array.from(event.target.files ?? []);
  event.target.value = "";
  if (!files.length) return;
  props.editor.chain().focus().setImages(files).run();
  emit("close");
}
</script>

<template>
  <div data-slot="rich-text-image-form" class="flex flex-wrap items-center gap-2 border-t p-2">
    <Input type="text" class="min-w-48 flex-1" :aria-label="translate('chelone.rich_text.image_url', { _: 'Image URL' })" :aria-invalid="invalid" v-model="url" @update:model-value="invalid = false" @keydown.enter.prevent="apply" />
    <Button size="sm" @click="apply">{{ translate("chelone.rich_text.image_apply", { _: "Apply" }) }}</Button>
    <Button size="sm" variant="outline" @mousedown.prevent @click="fileInput?.click()">{{ translate("chelone.rich_text.image_upload", { _: "Upload" }) }}</Button>
    <input ref="fileInput" type="file" accept="image/*" multiple hidden :aria-label="translate('chelone.rich_text.image_upload', { _: 'Upload' })" @change="choose" />
    <p v-if="invalid" role="alert" class="w-full text-destructive text-xs">{{ translate("chelone.rich_text.invalid_image_url", { _: "Enter a link to an image" }) }}</p>
  </div>
</template>
