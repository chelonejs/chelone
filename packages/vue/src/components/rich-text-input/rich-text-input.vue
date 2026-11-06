<script lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
import type { LooseRecord, SourceProp } from "@chelone/core";
import type { Editor, EditorOptions } from "@tiptap/core";
import type { RichTextImageOptions } from "@chelone/core";
import type { SourceInputProps } from "../admin/inputs/source-input-props";

/** Props for {@link RichTextInput}. */
export interface RichTextInputProps<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> extends SourceInputProps<RecordType, TPath> {
  helperText?: string | false;
  disabled?: boolean;
  readOnly?: boolean;
  /** Shown while the editor is empty. */
  placeholder?: string;
  /** Image insertion and upload settings. False leaves images out of the default schema. */
  images?: boolean | RichTextImageOptions;
  /**
   * Extra tiptap editor options, spread last: `extensions` here replaces the
   * default set. `onUpdate` and `onBlur` run after the input's own.
   */
  editorOptions?: Partial<EditorOptions>;
  class?: string;
}

/** What the `#toolbar` slot receives. */
export interface RichTextInputToolbarSlotProps {
  editor: Editor;
}
</script>

<script setup lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
/**
 * `<RichTextInput>` — edits an HTML string in a tiptap editor with a formatting
 * toolbar. The Vue twin of `@chelone/react`'s
 * `rich-text-input/rich-text-input.tsx`, on `@tiptap/vue-3`.
 *
 * Needs the optional `@tiptap/*` peers. The value is always an HTML string, and
 * the editor's schema decides what survives: scripts, frames, event handlers and
 * unsafe link URLs are dropped. Clearing the editor stores `""`, not null. From
 * npm, also import `@chelone/vue/rich-text-input.css` once for the content
 * styles; the registry item ships that file with the component. The `#toolbar`
 * slot, which receives `{ editor }`, replaces the default toolbar.
 *
 * @example
 * import { RichTextInput } from "@chelone/vue/rich-text-input";
 *
 * <RichTextInput source="body" label="Article" />
 */

import {
  richTextStarterKitOptions,
} from "@chelone/core";
import { Placeholder } from "@tiptap/extensions";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { Editor as VueEditor, EditorContent, useEditor } from "@tiptap/vue-3";
import { computed, type VNode, watch } from "vue";
import { useInput } from "../../form/use-input";
import { useResourceContext } from "../../resource-context";
import FieldLabelText from "../admin/common/field-label-text.vue";
import InputHelperText from "../admin/common/input-helper-text.vue";
import ErrorMessage from "../admin/common/validation-error.vue";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { getRichTextHtml, RichTextImage, resolveRichTextImageConfig } from "./rich-text-image";
import RichTextToolbar from "./rich-text-toolbar.vue";
import "./rich-text.css";

// Explicit `undefined` defaults disable Vue's absent-Boolean cast of the
// `string | false` props (else absent becomes `false` and hides the label).
const props = withDefaults(
  defineProps<RichTextInputProps<RecordType, TPath>>(),
  {
    label: undefined,
    helperText: undefined,
    images: true,
  },
);

defineSlots<{ toolbar?: (scope: RichTextInputToolbarSlotProps) => VNode[] }>();

const { id, isRequired, value, setValue, blur, error, touched } = useInput({
  source: props.source,
  // Identity, so clearing the editor stores "" and not null.
  parse: (input) => input,
  defaultValue: props.defaultValue ?? "",
  validate: props.validate,
});

const resource = useResourceContext();
const labelId = `${id}-label`;
const html = computed(() => (typeof value.value === "string" ? value.value : ""));
const editable = computed(() => props.disabled !== true && props.readOnly !== true);
const invalid = computed(() => touched.value && error.value != null);

// tiptap's `levels` is a mutable array, and core's options are frozen.
const starterKitOptions = {
  ...richTextStarterKitOptions,
  heading: { levels: [...richTextStarterKitOptions.heading.levels] },
};

const buildEditorOptions = (): Partial<EditorOptions> => ({
  extensions: [
    StarterKit.configure(starterKitOptions),
    ...(props.images === false ? [] : [RichTextImage.configure({ config: () => resolveRichTextImageConfig(props.images) })]),
    // The extension reads the text on each render, so a new one needs no new editor.
    Placeholder.configure({ placeholder: () => props.placeholder ?? "" }),
  ],
  content: html.value,
  editable: editable.value,
  editorProps: {
    attributes: {
      class: "rich-text min-h-32 px-3 py-2 outline-none",
      ...(props.label === false ? {} : { "aria-labelledby": labelId }),
    },
  },
  ...props.editorOptions,
  onUpdate: (event) => {
    setValue(getRichTextHtml(event.editor));
    props.editorOptions?.onUpdate?.(event);
  },
  onBlur: (event) => {
    blur();
    props.editorOptions?.onBlur?.(event);
  },
});

const editor = useEditor(buildEditorOptions());
watch(
  () => props.images === false,
  () => {
    const current = editor.value;
    if (!current) return;
    const content = getRichTextHtml(current);
    current.destroy();
    editor.value = new VueEditor({ ...buildEditorOptions(), content });
  },
);

// `setEditable` and the placeholder text dispatch nothing, so an empty
// transaction tells the toolbar and the placeholder decoration to read again.
watch(
  [editor, editable, () => props.placeholder],
  ([current, canEdit]) => {
    if (!current) return;
    current.setEditable(canEdit, false);
    current.view.dispatch(current.state.tr);
  },
  { flush: "post" },
);

// A reset or `setValue` changes the form value without the editor knowing.
watch([editor, html], ([current, next]) => {
  if (!current) return;
  const now = getRichTextHtml(current);
  if (now === next) return;
  const { from, to } = current.state.selection;
  current.commands.setContent(next, { emitUpdate: false });
  // The old positions may lie past the end of the new document, or between blocks.
  const { doc, tr } = current.state;
  const clamp = (pos: number) => doc.resolve(Math.min(pos, doc.content.size));
  current.view.dispatch(
    tr.setSelection(TextSelection.between(clamp(from), clamp(to))),
  );
});
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <FieldLabel
      v-if="label !== false"
      :id="labelId"
      :html-for="id"
      @click="editor?.commands.focus()"
    >
      <FieldLabelText
        :label="label"
        :source="source"
        :resource="resource"
        :is-required="isRequired"
      />
    </FieldLabel>
    <div
      :id="id"
      data-slot="rich-text-input"
      :aria-invalid="invalid || undefined"
      :class="[
        'overflow-hidden rounded-md border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive',
        !editable && 'opacity-60',
      ]"
    >
      <template v-if="editor">
        <slot name="toolbar" :editor="editor">
          <RichTextToolbar :editor="editor" />
        </slot>
      </template>
      <EditorContent :editor="editor" />
    </div>
    <InputHelperText :helper-text="helperText" />
    <FieldError v-if="invalid">
      <ErrorMessage :error="error" />
    </FieldError>
  </Field>
</template>
