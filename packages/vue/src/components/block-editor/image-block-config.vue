<script setup lang="ts">
/**
 * The config of the image block: the URL, alt text and width, and a file of up
 * to 5 MB that the document stores as a data URL.
 */

import { isSafeImageSrc, MAX_IMAGE_BYTES } from "@chelone/core";
import { ref, useId } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { FieldLabel } from "../ui/field";
import Input from "../ui/input.vue";
import type { ImageAttrs } from "./default-blocks";

const props = defineProps<{
  attrs: ImageAttrs;
  onChange: (attrs: Partial<ImageAttrs>) => void;
}>();

const translate = useTranslate();
const ids = { src: useId(), alt: useId(), width: useId(), file: useId() };
const failed = ref(false);
// The draft lets the user type through a width below the minimum.
const draft = ref<string | null>(null);

function setWidth(value: string) {
  draft.value = value;
  const width = Number(value);
  if (value !== "" && width >= 10 && width <= 100) {
    props.onChange({ widthPct: width });
  }
}

function upload(event: Event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  input.value = "";
  // Read now: the toolbar hands a new `onChange` to whichever block is selected when the file finishes reading.
  const { onChange } = props;
  if (!file) return;
  if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
    failed.value = true;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const { result } = reader;
    if (
      typeof result === "string" &&
      isSafeImageSrc(result, { allowDataImages: true })
    ) {
      failed.value = false;
      onChange({ src: result });
    } else failed.value = true;
  };
  reader.onerror = () => {
    failed.value = true;
  };
  reader.readAsDataURL(file);
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <div class="flex flex-col gap-1.5">
      <FieldLabel :html-for="ids.src">
        {{ translate("chelone.block_editor.image.url", { _: "Image URL" }) }}
      </FieldLabel>
      <Input
        :id="ids.src"
        type="url"
        :model-value="attrs.src.startsWith('data:') ? '' : attrs.src"
        @update:model-value="onChange({ src: $event })"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <FieldLabel :html-for="ids.alt">
        {{ translate("chelone.block_editor.image.alt", { _: "Alt text" }) }}
      </FieldLabel>
      <Input
        :id="ids.alt"
        :model-value="attrs.alt"
        @update:model-value="onChange({ alt: $event })"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <FieldLabel :html-for="ids.width">
        {{ translate("chelone.block_editor.image.width", { _: "Width (%)" }) }}
      </FieldLabel>
      <Input
        :id="ids.width"
        type="number"
        min="10"
        max="100"
        :model-value="draft ?? String(attrs.widthPct)"
        @update:model-value="setWidth"
        @blur="draft = null"
      />
    </div>
    <div class="flex flex-col gap-1.5">
      <FieldLabel :html-for="ids.file">
        {{ translate("chelone.block_editor.image.upload", { _: "Upload image" }) }}
      </FieldLabel>
      <Input :id="ids.file" type="file" accept="image/*" @change="upload" />
      <p v-if="failed" role="alert" class="text-destructive text-sm">
        {{ translate("chelone.block_editor.image.too_large", { _: "Choose an image file up to 5 MB" }) }}
      </p>
    </div>
  </div>
</template>
