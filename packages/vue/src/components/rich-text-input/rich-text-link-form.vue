<script setup lang="ts">
/**
 * The link form under the toolbar: applies a safe URL to the selection, or
 * removes the link. A URL `isSafeLinkUrl` rejects is never written.
 */

import { isSafeLinkUrl } from "@chelone/core";
import type { Editor } from "@tiptap/core";
import { ref } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import Button from "../ui/button.vue";
import Input from "../ui/input.vue";

const props = defineProps<{ editor: Editor }>();
const emit = defineEmits<{ close: [] }>();

const translate = useTranslate();
const url = ref<string>(props.editor.getAttributes("link").href ?? "");
const invalid = ref(false);

function apply() {
  const { editor } = props;
  const href = url.value.trim();
  if (href === "") {
    remove();
    return;
  }
  if (!isSafeLinkUrl(href)) {
    invalid.value = true;
    return;
  }
  if (editor.state.selection.empty && !editor.isActive("link")) {
    // Nothing is selected, so the link's text is its address.
    editor
      .chain()
      .focus()
      .insertContent({
        type: "text",
        text: href,
        marks: [{ type: "link", attrs: { href } }],
      })
      .run();
  } else {
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }
  emit("close");
}

function remove() {
  props.editor.chain().focus().extendMarkRange("link").unsetLink().run();
  emit("close");
}

function onInput(value: string) {
  url.value = value;
  invalid.value = false;
}
</script>

<template>
  <div
    data-slot="rich-text-link-form"
    class="flex flex-wrap items-center gap-2 border-t p-2"
  >
    <Input
      type="text"
      class="min-w-48 flex-1"
      :aria-label="translate('chelone.rich_text.link_url', { _: 'URL' })"
      :aria-invalid="invalid"
      :model-value="url"
      @keydown.enter.prevent="apply"
      @update:model-value="onInput"
    />
    <Button size="sm" @click="apply">
      {{ translate("chelone.rich_text.link_apply", { _: "Apply" }) }}
    </Button>
    <Button size="sm" variant="outline" @click="remove">
      {{ translate("chelone.rich_text.link_remove", { _: "Remove" }) }}
    </Button>
    <p v-if="invalid" role="alert" class="w-full text-destructive text-xs">
      {{
        translate("chelone.rich_text.invalid_url", {
          _: "Enter a web, mail or phone link",
        })
      }}
    </p>
  </div>
</template>
