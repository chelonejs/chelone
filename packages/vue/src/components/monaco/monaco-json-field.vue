<script lang="ts">
import type { LooseRecord } from "@chelone/core";
import type { editor } from "monaco-editor";
import { defineAsyncComponent } from "vue";
import MonacoSkeleton from "./internal/monaco-skeleton.vue";

/** Props for {@link MonacoJsonField}. */
export interface MonacoJsonFieldProps {
  source: string;
  record?: LooseRecord;
  /** Shown when the record has no value at `source`. */
  defaultValue?: unknown;
  /** Editor height in pixels when `autoHeight` is false. Defaults to 200. */
  height?: number;
  /** Grow with the content up to `maxHeight`. Defaults to true. */
  autoHeight?: boolean;
  /** Tallest the editor grows to when `autoHeight` is on. Defaults to 400. */
  maxHeight?: number;
  class?: string;
  /** Merged over the read-only defaults, so it can override any of them. */
  monacoOptions?: editor.IStandaloneEditorConstructionOptions;
}

/**
 * `<MonacoJsonField>` — shows a JSON (or JSON-string) field value in a
 * read-only Monaco editor. The Vue twin of `@chelone/react`'s
 * `monaco/monaco-json-field.tsx`.
 *
 * Monaco loads in a separate chunk on first render, so the base bundle carries
 * nothing. Needs the optional `monaco-editor` and `@guolao/vue-monaco-editor`
 * peers.
 *
 * @example
 * import { MonacoJsonField } from "@chelone/vue/monaco";
 *
 * <MonacoJsonField source="metadata" />
 */
export default defineAsyncComponent({
  loader: () => import("./monaco-json-field-lazy.vue"),
  loadingComponent: MonacoSkeleton,
  delay: 0,
});
</script>
