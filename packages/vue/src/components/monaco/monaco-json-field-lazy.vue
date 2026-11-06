<script
  setup
  lang="ts"
  generic="RecordType extends LooseRecord = LooseRecord"
>
/**
 * The lazy half of `<MonacoJsonField>` and the only file that imports
 * `monaco-editor` at run time.
 */

import { loader, VueMonacoEditor } from "@guolao/vue-monaco-editor";
import type { LooseRecord } from "@chelone/core";
import type { editor } from "monaco-editor";
import * as monaco from "monaco-editor";
import { computed, shallowRef, type VNode } from "vue";
import { useTranslate } from "../../i18n/use-translate";
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

const props = withDefaults(
  defineProps<MonacoJsonFieldProps<RecordType>>(),
  {
    height: 200,
    autoHeight: true,
    maxHeight: 400,
  },
);

defineSlots<{ empty?: () => VNode[] }>();

const translate = useTranslate();
const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const missing = computed(() => value.value == null);

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
  <slot v-if="missing && $slots.empty" name="empty" />
  <span v-else-if="missing && empty" :class="cn(props.class)">{{
    translate(empty, { _: empty })
  }}</span>
  <div
    v-else
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
