<script lang="ts">
import type { SourceProp, Validator } from "@chelone/core";
import type { editor } from "monaco-editor";

/** Props for {@link MonacoJsonInput}. */
export interface MonacoJsonInputProps {
  source: SourceProp;
  label?: string | false;
  defaultValue?: unknown;
  validate?: Validator | readonly Validator[];
  helperText?: string | false;
  disabled?: boolean;
  readOnly?: boolean;
  /** A JSON Schema the value is checked against. Object shape only. */
  schema?: object;
  /** A schema Monaco fetches from this URL. Ignored when `schema` is set. */
  schemaUri?: string;
  /** Tolerate comments and trailing commas in the text. */
  allowComments?: boolean;
  /** Grow with the content between `minHeight` and `maxHeight`. Defaults to false. */
  autoHeight?: boolean;
  /** Editor height in pixels when `autoHeight` is false. Defaults to 300. */
  height?: number;
  /** Shortest the editor gets when `autoHeight` is on. Defaults to 120. */
  minHeight?: number;
  /** Tallest the editor grows to when `autoHeight` is on. Defaults to 600. */
  maxHeight?: number;
  /** Show the Format button. Defaults to true. */
  showFormatButton?: boolean;
  /** Class for the field wrapper. */
  class?: string;
  /** Class for the editor frame. */
  editorClass?: string;
  /** Merged over the editor defaults, so it can override any of them. */
  monacoOptions?: editor.IStandaloneEditorConstructionOptions;
}
</script>

<script setup lang="ts">
/**
 * `<MonacoJsonInput>` — edits a JSON value in Monaco, with JSON Schema checks
 * and error markers. The Vue twin of `@chelone/react`'s
 * `monaco/monaco-json-input.tsx`.
 *
 * A value that starts as a string stays a string and is written back as
 * typed; any other value is edited as JSON and written back parsed. While the
 * text is not valid JSON the form keeps the last valid value. A Monaco error
 * marker blocks submit.
 *
 * Monaco loads in a separate chunk on first render, so the base bundle carries
 * nothing. Needs the optional `monaco-editor` and `@guolao/vue-monaco-editor`
 * peers.
 *
 * @example
 * import { MonacoJsonInput } from "@chelone/vue/monaco";
 *
 * <MonacoJsonInput source="settings" :schema="settingsSchema" />
 */

import { defineAsyncComponent } from "vue";
import MonacoSkeleton from "./internal/monaco-skeleton.vue";

// `defineAsyncComponent`'s own loading slot takes no props, and the skeleton
// has to match the editor's height, so `<Suspense>` shows it instead.
const MonacoJsonInputLazy = defineAsyncComponent(
  () => import("./monaco-json-input-lazy.vue"),
);

// Explicit defaults keep Vue's absent-Boolean cast from turning an unset
// `label` into `false` or an unset `showFormatButton` off.
const props = withDefaults(defineProps<MonacoJsonInputProps>(), {
  label: undefined,
  helperText: undefined,
  autoHeight: false,
  showFormatButton: true,
});
</script>

<template>
  <Suspense>
    <MonacoJsonInputLazy v-bind="props" />
    <template #fallback>
      <MonacoSkeleton
        :height="props.autoHeight ? (props.minHeight ?? 120) : (props.height ?? 300)"
        :class="props.class"
      />
    </template>
  </Suspense>
</template>
