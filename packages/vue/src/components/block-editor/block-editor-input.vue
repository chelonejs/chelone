<script lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
import type { LooseRecord, SourceProp } from "@chelone/core";
import type { SourceInputProps } from "../admin/inputs/source-input-props";
import type { BlockDefinition } from "./block-nodes";

/** Props for {@link BlockEditorInput}. */
export interface BlockEditorInputProps<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> extends SourceInputProps<RecordType, TPath> {
  /** Read once, when the editor mounts. */
  blocks?: readonly BlockDefinition[];
  /** Shown in an empty paragraph. */
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  helperText?: string | false;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
/**
 * `<BlockEditorInput>` — edits a block document: rich text and app-defined
 * blocks, stored as tiptap JSON. An empty document is stored as `null`, so
 * `required()` rejects it. The Vue twin of `@chelone/react`'s
 * `block-editor/block-editor-input.tsx`.
 *
 * Needs the optional `@tiptap/*` peers.
 *
 * @example
 * import { BlockEditorInput, defineBlock } from "@chelone/vue/block-editor";
 *
 * <BlockEditorInput source="body" :blocks="[callout]" />
 */

import { type BlockDocNode, isBlockDoc, isEmptyBlockDocument } from "@chelone/core";
import { computed } from "vue";
import { useInput } from "../../form/use-input";
import FieldLabelText from "../admin/common/field-label-text.vue";
import InputHelperText from "../admin/common/input-helper-text.vue";
import ErrorText from "../admin/common/validation-error.vue";
import { Field, FieldError, FieldLabel } from "../ui/field";
import BlockEditor from "./block-editor.vue";

// Explicit `undefined` defaults disable Vue's absent-Boolean cast of the
// `string | false` props (else absent becomes `false` and hides the label).
const inputProps = withDefaults(
  defineProps<BlockEditorInputProps<RecordType, TPath>>(),
  { helperText: undefined, label: undefined },
);

const { id, isRequired, value, setValue, blur, error, touched } = useInput({
  validate: inputProps.validate,
  defaultValue: inputProps.defaultValue ?? null,
  source: inputProps.source,
});

const stored = computed(() => (isBlockDoc(value.value) ? value.value : null));
const editable = computed(() => inputProps.disabled !== true && inputProps.readOnly !== true);
const invalid = computed(() => touched.value && error.value != null);

const write = (doc: BlockDocNode) =>
  setValue(isEmptyBlockDocument(doc) ? null : doc);
</script>

<template>
  <Field :class="inputProps.class" :data-invalid="invalid">
    <FieldLabel v-if="label !== false" :html-for="id">
      <FieldLabelText
        :source="source"
        :is-required="isRequired"
        :label="label"
      />
    </FieldLabel>
    <div
      :id="id"
      data-slot="block-editor-input"
      :aria-invalid="invalid || undefined"
      :class="[
        'overflow-hidden rounded-md border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 aria-invalid:border-destructive',
        !editable && 'opacity-60',
      ]"
    >
      <BlockEditor
        :value="stored"
        :blocks="blocks"
        :editable="editable"
        :placeholder="placeholder"
        @change="write"
        @blur="blur"
      />
    </div>
    <InputHelperText :helper-text="helperText" />
    <FieldError v-if="invalid">
      <ErrorText :error="error" />
    </FieldError>
  </Field>
</template>
