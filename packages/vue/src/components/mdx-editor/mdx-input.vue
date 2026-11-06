<script lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
import type { LooseRecord, SourceProp } from "@chelone/core";
import type { CrepeEditorConfig } from "./internal/crepe-editor.vue";
import type { SourceInputProps } from "../admin/inputs/source-input-props";

/** Props for {@link MdxInput}. */
export interface MdxInputProps<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> extends SourceInputProps<RecordType, TPath> {
  helperText?: string | false;
  disabled?: boolean;
  readOnly?: boolean;
  /** Merged under the editor defaults; `code-mirror` and `latex` stay off. */
  crepeConfig?: CrepeEditorConfig;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
/**
 * `<MdxInput>` — edits a markdown string in a Crepe editor. The Vue twin of
 * `@chelone/react`'s `mdx-editor/mdx-input.tsx`; it wraps Milkdown's Crepe
 * because `@mdxeditor/editor` is React only.
 *
 * Needs the optional `@milkdown/crepe` and `@milkdown/kit` peers. From npm, also
 * import `@chelone/vue/mdx-editor.css` for the Chelone theme; the registry item
 * ships that file with the component. The value is always a markdown string;
 * clearing the editor stores `""`, not null.
 *
 * @example
 * import { MdxInput } from "@chelone/vue/mdx-editor";
 *
 * <MdxInput source="body" label="Notes" />
 */

import { computed } from "vue";
import { useInput } from "../../form/use-input";
import { cn } from "../../lib/utils";
import FieldLabelText from "../admin/common/field-label-text.vue";
import InputHelperText from "../admin/common/input-helper-text.vue";
import ValidationError from "../admin/common/validation-error.vue";
import { Field, FieldError, FieldLabel } from "../ui/field";
import CrepeEditor from "./internal/crepe-editor.vue";

// Explicit `undefined` defaults disable Vue's absent-Boolean cast of the
// `string | false` props (else absent becomes `false` and hides the label).
const props = withDefaults(
  defineProps<MdxInputProps<RecordType, TPath>>(),
  {
    label: undefined,
    helperText: undefined,
  },
);

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue ?? "",
  validate: props.validate,
  // Identity, so clearing the editor stores "" and not null.
  parse: (input) => input,
});

const markdown = computed(() =>
  typeof value.value === "string" ? value.value : "",
);
const invalid = computed(() => touched.value && error.value != null);
</script>

<template>
  <Field :class="cn(props.class)" :data-invalid="invalid">
    <FieldLabel v-if="label !== false" :html-for="id">
      <FieldLabelText :label="label" :source="source" :is-required="isRequired" />
    </FieldLabel>
    <div :id="id">
      <CrepeEditor
        :markdown="markdown"
        :readonly="disabled === true || readOnly === true"
        :crepe-config="crepeConfig"
        @change="setValue"
        @blur="blur"
      />
    </div>
    <InputHelperText :helper-text="helperText" />
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
