<script lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
import type {
  FileEntry,
  FileSelection,
  LooseRecord,
  SourceProp,
  TransformedFile,
} from "@chelone/core";
import type { SourceInputProps } from "./source-input-props";

/** Props for {@link FileInput}. */
export interface FileInputProps<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> extends SourceInputProps<RecordType, TPath> {
  /** Override the ambient resource (label-key resolution). */
  resource?: string;
  /** Helper text under the dropzone. */
  helperText?: string;
  /** Read transform (the files in the form → the files shown). Default makes a preview record of each dropped file. */
  format?: (value: FileSelection) => FileSelection;
  /** Write transform (the dropped or remaining files → stored value). Default makes a preview record of each dropped file. */
  parse?: (value: FileSelection) => FileSelection;
  /**
   * The native `accept` attribute (a comma-separated MIME/extension list, e.g.
   * `"image/*,application/pdf"`). DIVERGENCE from the React twin's react-dropzone
   * object form — the native `<input type=file>` speaks the string form.
   */
  accept?: string;
  /** Accept multiple files (the value becomes an array). Default `false`. */
  multiple?: boolean;
  /** Disables the control. */
  disabled?: boolean;
  /** Renders the control read-only. */
  readonly?: boolean;
  /** Placeholder text shown in the dropzone (overrides the default labels). */
  placeholder?: string;
  /** i18n key for the multiple-files prompt. */
  labelMultiple?: string;
  /** i18n key for the single-file prompt. */
  labelSingle?: string;
  /** Root element class passthrough. */
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
/**
 * `<FileInput>` — a file-upload input with drag-and-drop + previews, the Vue
 * analog of `@chelone/react`'s `inputs/file-input.tsx`.
 *
 * ## Divergence: native drag-drop, NOT react-dropzone
 * The React twin is powered by `react-dropzone` (React-only). Vue cannot use it,
 * so the drop UI is hand-rolled from native events: a `dragover`/`drop`-handling
 * dropzone `<div>` plus a hidden `<input type=file>` triggered on click. The
 * VALUE logic is unchanged from the twin — the same `transformFiles` `format`/
 * `parse` (a dropped `File` → `{ rawFile, src, title }`), the same `multiple`
 * append semantics, and the same `shallowEqual`-based removal. Only the drop
 * SURFACE differs; the form binding is shared through {@link useInput}.
 *
 * Each existing/dropped file is published to a preview slot through a per-file
 * {@link FileInputPreview} (which provides the file as the ambient record), so a
 * preview child (a field, an `<img>`) renders it. `<ImageInput>` wraps this.
 */

import {
  fileEntryKey,
  toFileEntries,
  toFileSelection,
} from "@chelone/core";
import { computed, ref, useSlots } from "vue";
import { useInput } from "../../../form/use-input";
import { useTranslate } from "../../../i18n/use-translate";
import { shallowEqual } from "../../../lib/shallow-equal";
import { Field, FieldDescription, FieldError, FieldLabel } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import FileInputPreview from "./file-input-preview.vue";
import { targetOf } from "./event-target";
import { humanizeSource } from "./label-text";

const props = withDefaults(
  defineProps<FileInputProps<RecordType, TPath>>(),
  {
    label: undefined,
    multiple: false,
    labelMultiple: "chelone.input.file.upload_several",
    labelSingle: "chelone.input.file.upload_single",
  },
);

const translate = useTranslate();
const slots = useSlots();
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

/** Turn a browser `File` into the expected preview record (twin parity). */
function transformFile(file: FileEntry): FileEntry {
  if (!(file instanceof File)) return file;
  // jsdom lacks createObjectURL; guard so the transform never throws there.
  const preview =
    typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
      ? URL.createObjectURL(file)
      : "";
  const transformed: TransformedFile = {
    rawFile: file,
    src: preview,
    title: file.name,
  };
  return transformed;
}

function transformFiles(files: FileSelection): FileSelection {
  if (!files) return props.multiple ? [] : null;
  if (Array.isArray(files)) return files.map(transformFile);
  return transformFile(files);
}

// `format` and `parse` run here on the files, so the binding keeps its
// defaults.
const { id, name, value, setValue, blur, error, touched, isRequired } = useInput(
  {
    source: props.source,
    defaultValue: props.defaultValue,
    validate: props.validate,
  },
);

const format = (selection: FileSelection) =>
  (props.format ?? transformFiles)(selection);
const parse = (selection: FileSelection) =>
  (props.parse ?? transformFiles)(selection);

const files = computed(() => toFileEntries(format(toFileSelection(value.value))));

const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);
const promptText = computed(() =>
  props.placeholder ??
  translate(props.multiple ? props.labelMultiple : props.labelSingle, {
    _: props.multiple ? "Drop files to upload, or click to select one." : "Drop a file to upload, or click to select it.",
  }),
);
const hasPreview = computed(() => slots.default != null);
const isDisabled = computed(() => props.disabled === true || props.readonly === true);

function commit(newFiles: File[]) {
  if (newFiles.length === 0) return;
  if (props.multiple) {
    setValue(parse([...files.value, ...newFiles]));
  } else {
    setValue(parse(newFiles[0] ?? null));
  }
  blur();
}

function onFileChange(event: Event) {
  const input = targetOf(event, HTMLInputElement);
  if (!input) return;
  const list = input.files ? Array.from(input.files) : [];
  commit(list);
  // Allow re-selecting the same file.
  input.value = "";
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  if (isDisabled.value) return;
  const list = event.dataTransfer?.files
    ? Array.from(event.dataTransfer.files)
    : [];
  commit(list);
}

function onDragOver() {
  if (!isDisabled.value) isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function openPicker() {
  if (!isDisabled.value) fileInputRef.value?.click();
}

function onRemove(file: FileEntry) {
  if (props.multiple) {
    setValue(
      parse(files.value.filter((stateFile) => !shallowEqual(stateFile, file))),
    );
  } else {
    setValue(parse(null));
  }
  blur();
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid" class="w-full">
    <FieldLabel
      :html-for="id"
      :class="isDisabled ? 'cursor-default' : 'cursor-pointer'"
    >
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>

    <div
      data-slot="file-input-dropzone"
      :class="[
        'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        isDisabled
          ? 'cursor-not-allowed bg-muted'
          : 'cursor-pointer bg-muted text-muted-foreground hover:border-sidebar-ring',
        invalid && 'border-destructive',
        isDragging && 'border-sidebar-ring',
      ]"
      @click="openPicker"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <input
        :id="id"
        ref="fileInputRef"
        type="file"
        class="hidden"
        :name="name"
        :accept="accept"
        :multiple="multiple"
        :disabled="isDisabled"
        :aria-invalid="invalid || undefined"
        @change="onFileChange"
      />
      <p class="text-sm">{{ promptText }}</p>
    </div>

    <FieldDescription v-if="helperText">{{ helperText }}</FieldDescription>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>

    <div
      v-if="hasPreview"
      data-slot="file-input-previews"
      class="previews flex flex-col gap-1"
    >
      <FileInputPreview
        v-for="(file, index) in files"
        :key="fileEntryKey(file, index)"
        :file="file"
        @remove="onRemove(file)"
      >
        <slot :record="file" />
      </FileInputPreview>
    </div>
  </Field>
</template>
