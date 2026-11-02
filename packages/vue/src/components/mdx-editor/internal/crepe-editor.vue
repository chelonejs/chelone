<script lang="ts">
import type { CrepeConfig } from "@milkdown/crepe";

/** The Crepe options an app may set; the editor owns `root` and `defaultValue`. */
export type CrepeEditorConfig = Pick<CrepeConfig, "features" | "featureConfigs">;
</script>

<script setup lang="ts">
/**
 * The only file that builds a Crepe editor. The editor is uncontrolled, so
 * `markdown` is pushed in on change, and a `markdownUpdated` that carries the
 * text the parent already holds is not reported back as an edit.
 */

import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import { replaceAll } from "@milkdown/kit/utils";
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import "../mdx-editor-theme.css";

const props = defineProps<{
  markdown: string;
  readonly: boolean;
  crepeConfig?: CrepeEditorConfig;
}>();

const emit = defineEmits<{
  change: [markdown: string];
  blur: [];
}>();

const root = useTemplateRef<HTMLElement>("root");

let crepe: Crepe | undefined;
let ready = false;
let unmounted = false;

function pushMarkdown(next: string) {
  if (crepe && ready && crepe.getMarkdown() !== next) {
    crepe.editor.action(replaceAll(next));
  }
}

onMounted(async () => {
  const { features, featureConfigs, ...rest } = props.crepeConfig ?? {};
  const instance = new Crepe({
    ...rest,
    root: root.value,
    defaultValue: props.markdown,
    // Both load heavy bundles of their own (CodeMirror, KaTeX).
    features: {
      ...features,
      [Crepe.Feature.CodeMirror]: false,
      [Crepe.Feature.Latex]: false,
    },
    featureConfigs,
  });
  crepe = instance;
  instance.on((api) => {
    api.markdownUpdated((_ctx, markdown) => {
      if (markdown !== props.markdown) emit("change", markdown);
    });
    api.blur(() => emit("blur"));
  });

  await instance.create();
  if (unmounted) {
    await instance.destroy();
    return;
  }
  instance.setReadonly(props.readonly);
  ready = true;
  // The value may have changed while the editor was being created.
  pushMarkdown(props.markdown);
});

watch(
  () => props.markdown,
  (next) => pushMarkdown(next),
);

watch(
  () => props.readonly,
  (next) => {
    if (ready) crepe?.setReadonly(next);
  },
);

onBeforeUnmount(() => {
  unmounted = true;
  // Before `create()` resolves there is nothing to destroy yet; `onMounted`
  // does it once it has.
  if (ready) void crepe?.destroy();
});
</script>

<template>
  <div ref="root" data-slot="mdx-editor" class="chelone-mdx-editor" />
</template>
