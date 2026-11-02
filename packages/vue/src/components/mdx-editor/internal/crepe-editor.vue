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
 *
 * Milkdown re-serializes what it holds (it ends the text with a newline and may
 * change markers), so the prop never equals `getMarkdown()` byte for byte. The
 * editor's own serialization of the last prop it received is remembered in
 * `applied` and compared in its place.
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
/** A prop value, and what the editor serialized after it took that value in. */
let applied: { prop: string; serialized: string } | undefined;

function pushMarkdown(next: string) {
  if (!crepe || !ready) return;
  const current = crepe.getMarkdown();
  if (current === next) return;
  if (applied?.prop === next && applied.serialized === current) return;
  crepe.editor.action(replaceAll(next));
  applied = { prop: next, serialized: crepe.getMarkdown() };
}

/** The editor reporting text it holds because of the prop, not because of an edit. */
function isOwnText(markdown: string) {
  return (
    markdown === props.markdown ||
    (applied?.prop === props.markdown && applied.serialized === markdown)
  );
}

onMounted(async () => {
  const { features, featureConfigs, ...rest } = props.crepeConfig ?? {};
  const initial = props.markdown;
  const instance = new Crepe({
    ...rest,
    root: root.value,
    defaultValue: initial,
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
      if (!isOwnText(markdown)) emit("change", markdown);
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
  applied = { prop: initial, serialized: instance.getMarkdown() };
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
