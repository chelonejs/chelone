<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type { LooseRecord } from "@chelone/core";
import type { editor } from "monaco-editor";
import { defineAsyncComponent } from "vue";
import type { FieldProps } from "../admin/fields/field-props";
import MonacoSkeleton from "./internal/monaco-skeleton.vue";

/** Props for {@link MonacoJsonField}. */
export interface MonacoJsonFieldProps<
  RecordType extends LooseRecord = LooseRecord,
> extends FieldProps<RecordType> {
  /** Editor height in pixels when `autoHeight` is false. Defaults to 200. */
  height?: number;
  /** Grow with the content up to `maxHeight`. Defaults to true. */
  autoHeight?: boolean;
  /** Tallest the editor grows to when `autoHeight` is on. Defaults to 400. */
  maxHeight?: number;
  /** Shown instead of the editor when the value is missing; translated if it is a message key. */
  empty?: string;
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
 * peers. The `#empty` slot replaces the editor when the value is missing.
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
