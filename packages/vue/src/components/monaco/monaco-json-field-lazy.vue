<script setup lang="ts">
/**
 * The lazy half of `<MonacoJsonField>` and the only file that imports
 * `monaco-editor` at run time.
 */

import { loader, VueMonacoEditor } from "@guolao/vue-monaco-editor";
import type { editor } from "monaco-editor";
import * as monaco from "monaco-editor";
import { computed, shallowRef } from "vue";
import { cn } from "../../lib/utils";
import { useFieldValue } from "../../record/use-field-value";
import {
  useAutoHeight,
  useMonacoLayout,
  useMonacoTheme,
} from "./internal/monaco-composables";
import type { MonacoJsonFieldProps } from "./monaco-json-field.vue";

// Serve the bundled copy instead of the binding's default CDN fetch.
loader.config({ monaco });

const MIN_HEIGHT = 120;

const props = withDefaults(defineProps<MonacoJsonFieldProps>(), {
  height: 200,
  autoHeight: true,
  maxHeight: 400,
});

const value = useFieldValue({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const text = computed(() =>
  typeof value.value === "string"
    ? value.value
    : JSON.stringify(value.value ?? null, null, 2),
);

const instance = shallowRef<editor.IStandaloneCodeEditor | null>(null);
const theme = useMonacoTheme();
const contentHeight = useAutoHeight(
  instance,
  () => props.autoHeight,
  MIN_HEIGHT,
  () => props.maxHeight,
);
const container = useMonacoLayout(instance);

// The binding puts `height` straight into a style object, which needs a unit.
const editorHeight = computed(
  () => `${props.autoHeight ? contentHeight.value : props.height}px`,
);

const options = computed<editor.IStandaloneEditorConstructionOptions>(() => ({
  readOnly: true,
  domReadOnly: true,
  automaticLayout: false,
  minimap: { enabled: false },
  lineNumbers: "on",
  wordWrap: "on",
  tabSize: 2,
  ...props.monacoOptions,
}));
</script>

<template>
  <div
    ref="container"
    :class="cn('overflow-hidden rounded-md border', props.class)"
  >
    <VueMonacoEditor
      language="json"
      :value="text"
      :theme="theme"
      :height="editorHeight"
      :options="options"
      @mount="instance = $event"
    />
  </div>
</template>
