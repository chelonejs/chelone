<script lang="ts">
import type { SourceProp } from "@chelone/core";
import type { MonacoJsonInputProps } from "./monaco-json-input.vue";

/**
 * The lazy half's props: the public props with `source` open. `<MonacoJsonInput>`
 * is generic over its record and its path, and a template cannot carry a record
 * through to a child, so the path arrives as the open `string` its `useInput`
 * call reads it at.
 */
export interface MonacoJsonInputLazyProps<
  TPath extends string = SourceProp,
> extends Omit<MonacoJsonInputProps, "source"> {
  source: TPath;
}
</script>

<script setup lang="ts" generic="TPath extends string = SourceProp">
/**
 * The lazy half of `<MonacoJsonInput>` and the only file that imports
 * `monaco-editor` at run time.
 */

import {
  composeValidators,
  detectJsonShape,
  ERROR_SEVERITY,
  fromJsonText,
  type JsonShape,
  MODEL_PREFIX,
  stripJsonComments,
  toJsonText,
} from "@chelone/core";
import { loader, VueMonacoEditor } from "@guolao/vue-monaco-editor";
import type { editor } from "monaco-editor";
import * as monaco from "monaco-editor";
import { computed, ref, shallowRef, watch } from "vue";
import { useCheloneFormContext } from "../../form/form-context";
import { useInput } from "../../form/use-input";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import FieldLabelText from "../admin/common/field-label-text.vue";
import InputHelperText from "../admin/common/input-helper-text.vue";
import ValidationError from "../admin/common/validation-error.vue";
import Button from "../ui/button.vue";
import { Field, FieldError, FieldLabel } from "../ui/field";
import {
  useAutoHeight,
  useMonacoLayout,
  useMonacoTheme,
} from "./internal/monaco-composables";
import { useJsonSchema } from "./internal/use-json-schema";
import { useMonacoMarkers } from "./internal/use-monaco-markers";

// Serve the bundled copy instead of the binding's default CDN fetch.
loader.config({ monaco });

const identity = (value: unknown) => value;

// Explicit `undefined` defaults disable Vue's absent-Boolean cast of the
// `string | false` props (else absent becomes `false` and hides the label).
const props = withDefaults(defineProps<MonacoJsonInputLazyProps<TPath>>(), {
  label: undefined,
  helperText: undefined,
  height: 300,
  autoHeight: false,
  minHeight: 120,
  maxHeight: 600,
  showFormatButton: true,
});

const translate = useTranslate();
const instance = shallowRef<editor.IStandaloneCodeEditor | null>(null);
const monacoApi = shallowRef<typeof monaco | null>(null);

// The value shape locks on the first non-undefined value.
const shape = shallowRef<JsonShape | null>(null);
const jsonShape = computed(() => shape.value ?? "object");
const text = ref("");

const parseText = (source: string, textShape: JsonShape) =>
  fromJsonText(
    props.allowComments && textShape === "object"
      ? stripJsonComments(source)
      : source,
    textShape,
  );

// Chelone has no `trigger`: when the error state flips on a touched field,
// re-write its value so validation runs against the new markers.
let hadError = false;
let checking = 0;
const { markers, settled } = useMonacoMarkers(instance, monacoApi, (changed) => {
  const hasError = changed.some((m) => m.severity >= ERROR_SEVERITY);
  if (hasError === hadError) return;
  hadError = hasError;
  // A check waiting on `settled` reads these markers itself, and a rewrite
  // now would cancel it mid-flight, letting the submit it belongs to pass.
  if (checking > 0) return;
  if (touched.value) write(value.value);
});

// A save waits out Monaco's diagnostics delay so a schema error from the last
// edit is in the list before it is read. Re-checks while typing read what is
// there: waiting would hold a cleared error on screen and block Save.
const { form } = useCheloneFormContext();
const firstError = (list: editor.IMarker[]) =>
  list.find((marker) => marker.severity >= ERROR_SEVERITY)?.message;
const markerCheck = () => {
  if (!form.ambient.store.state.isSubmitting) return firstError(markers.value);
  checking++;
  return settled()
    .then(firstError)
    .finally(() => {
      checking--;
    });
};
// Monaco's markers lag the text by its diagnostics delay, so the text's own
// parse error is checked too: a stale marker list must not let bad text save.
const syntaxCheck = () => {
  if (shape.value === "string") return undefined;
  const { parseError } = parseText(text.value, "object");
  return parseError
    ? translate("chelone.validation.invalid_json", {
        _: "Invalid JSON: {message}",
        message: parseError.message,
      })
    : undefined;
};

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: composeValidators(
    markerCheck,
    syntaxCheck,
    ...(Array.isArray(props.validate)
      ? props.validate
      : props.validate
        ? [props.validate]
        : []),
  ),
  format: identity,
  parse: identity,
});

// `setValue` reads an object with a `target.value` as a DOM event, and a JSON
// value can look like one, so the value goes in as a synthetic event.
const write = (next: unknown) => setValue({ target: { value: next } });

shape.value = detectJsonShape(value.value);
text.value = toJsonText(value.value, jsonShape.value);

// The editor owns the text while the user types. It is only rebuilt from the
// form when the form's value changed to something the text doesn't say.
watch(value, (next) => {
  shape.value ??= detectJsonShape(next);
  const typed = parseText(text.value, jsonShape.value);
  const sameAsText =
    !typed.parseError &&
    toJsonText(typed.value, jsonShape.value) ===
      toJsonText(next, jsonShape.value);
  if (!sameAsText) text.value = toJsonText(next, jsonShape.value);
});

function handleChange(next: string | undefined) {
  text.value = next ?? "";
  // Editing an empty form value starts in object shape; a string typed as
  // `"abc"` is then a JSON string, not a reason to treat the field as text.
  shape.value ??= "object";
  const { value: parsed, parseError } = parseText(text.value, jsonShape.value);
  if (parseError) return;
  write(parsed);
}

watch(instance, (current, _previous, onCleanup) => {
  const subscription = current?.onDidBlurEditorWidget(() => blur());
  onCleanup(() => subscription?.dispose());
});

const theme = useMonacoTheme();
const contentHeight = useAutoHeight(
  instance,
  () => props.autoHeight,
  props.minHeight,
  () => props.maxHeight,
);
const container = useMonacoLayout(instance);

const modelPath = `${MODEL_PREFIX}${id.replace(/[^\w-]/g, "-")}.json`;
useJsonSchema(monacoApi, () => ({
  path: modelPath,
  schema: props.schema,
  schemaUri: props.schemaUri,
  allowComments: props.allowComments,
  enabled: jsonShape.value === "object",
}));

const locked = computed(() => Boolean(props.readOnly || props.disabled));
const formatLabel = computed(() =>
  translate("chelone.action.format", { _: "Format" }),
);
const invalid = computed(() => touched.value && error.value != null);

// The binding puts `height` straight into a style object, which needs a unit.
const editorHeight = computed(
  () => `${props.autoHeight ? contentHeight.value : props.height}px`,
);

const options = computed<editor.IStandaloneEditorConstructionOptions>(() => ({
  automaticLayout: false,
  minimap: { enabled: false },
  // Monaco counts the room it leaves below the last line in its content height, so auto-height would never settle.
  scrollBeyondLastLine: false,
  lineNumbers: "on",
  wordWrap: "on",
  tabSize: 2,
  readOnly: locked.value,
  ...props.monacoOptions,
}));

function onMount(mountedEditor: editor.IStandaloneCodeEditor, api: typeof monaco) {
  instance.value = mountedEditor;
  monacoApi.value = api;
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <FieldLabel v-if="label !== false" :html-for="id">
      <FieldLabelText :label="label" :source="source" :is-required="isRequired" />
    </FieldLabel>
    <div :class="cn('flex flex-col overflow-hidden rounded-md border', editorClass)">
      <div v-if="showFormatButton" class="flex justify-end border-b px-1 py-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-6 px-2"
          :aria-label="formatLabel"
          :disabled="locked"
          @click="instance?.getAction('editor.action.formatDocument')?.run()"
        >
          {{ formatLabel }}
        </Button>
      </div>
      <div :id="id" ref="container">
        <VueMonacoEditor
          language="json"
          :path="modelPath"
          :value="text"
          :theme="theme"
          :height="editorHeight"
          :options="options"
          @update:value="handleChange"
          @mount="onMount"
        />
      </div>
    </div>
    <InputHelperText :helper-text="helperText" />
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
