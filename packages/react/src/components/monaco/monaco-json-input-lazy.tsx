import {
  composeValidators,
  detectJsonShape,
  fromJsonText,
  toJsonText,
} from "@chelone/core";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../field-error-display";
import { useInput } from "../../form-hooks";
import { useTranslate } from "../../i18n-hooks";
import { useResourceContext } from "../../resource";
import {
  useAutoHeight,
  useMonacoLayout,
  useMonacoTheme,
} from "./internal/monaco-shared";
import { useJsonSchema } from "./internal/use-json-schema";
import { useMonacoMarkers } from "./internal/use-monaco-markers";
import type { MonacoJsonInputProps } from "./monaco-json-input";

// Serve the bundled copy instead of the binding's default CDN fetch.
loader.config({ monaco });

const ERROR_SEVERITY = 8;
const identity = (value: unknown) => value;

/** The only file that imports `monaco-editor` at run time. */
export default function MonacoJsonInputLazy({
  source,
  label,
  resource: resourceProp,
  helperText,
  className,
  editorClassName,
  disabled,
  readOnly,
  validate,
  isRequired: isRequiredProp,
  id: idProp,
  defaultValue,
  height = 300,
  autoHeight = false,
  minHeight = 120,
  maxHeight = 600,
  schema,
  schemaUri,
  allowComments,
  showFormatButton = true,
  monacoOptions,
}: MonacoJsonInputProps) {
  const resource = useResourceContext({ resource: resourceProp });
  const translate = useTranslate();
  const [instance, setInstance] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [monacoApi, setMonacoApi] = useState<typeof monaco | null>(null);

  // Chelone has no `trigger`: when the error state flips on a dirty field,
  // re-write its value so validation runs against the new markers.
  const revalidate = useRef<() => void>(() => {});
  const hadError = useRef(false);
  const markers = useMonacoMarkers(instance, monacoApi, (changed) => {
    const hasError = changed.some((m) => m.severity >= ERROR_SEVERITY);
    if (hasError === hadError.current) return;
    hadError.current = hasError;
    revalidate.current();
  });

  const markerCheck = () =>
    markers.current.find((marker) => marker.severity >= ERROR_SEVERITY)
      ?.message;
  const validator = composeValidators(
    markerCheck,
    ...(Array.isArray(validate) ? validate : validate ? [validate] : []),
  );

  const { id, field, fieldState, isRequired } = useInput({
    source,
    validate: validator,
    isRequired: isRequiredProp,
    id: idProp,
    defaultValue,
    format: identity,
    parse: identity,
  });
  revalidate.current = () => {
    if (fieldState.isDirty) field.onChange(field.value);
  };

  const shape = useRef(detectJsonShape(field.value));
  shape.current ??= detectJsonShape(field.value);
  const jsonShape = shape.current ?? "object";

  // The editor owns the text while the user types. It is only rebuilt from
  // the form when the form's value changed under it.
  const [text, setText] = useState(() => toJsonText(field.value, jsonShape));
  const lastValue = useRef(field.value);
  if (field.value !== lastValue.current) {
    lastValue.current = field.value;
    setText(toJsonText(field.value, jsonShape));
  }

  const handleChange = (next: string | undefined) => {
    const nextText = next ?? "";
    setText(nextText);
    const { value, parseError } = fromJsonText(nextText, jsonShape);
    if (parseError) return;
    lastValue.current = value;
    field.onChange(value);
  };

  const onBlur = useRef(field.onBlur);
  onBlur.current = field.onBlur;
  useEffect(() => {
    const subscription = instance?.onDidBlurEditorWidget(() =>
      onBlur.current(),
    );
    return () => subscription?.dispose();
  }, [instance]);

  const container = useRef<HTMLDivElement>(null);
  const theme = useMonacoTheme();
  const contentHeight = useAutoHeight(
    instance,
    autoHeight,
    minHeight,
    maxHeight,
  );
  useMonacoLayout(instance, container);
  const modelPath = `inmemory://monaco-json-input/${id.replace(/[^\w-]/g, "-")}.json`;
  useJsonSchema(monacoApi, {
    path: modelPath,
    schema,
    schemaUri,
    allowComments,
    enabled: jsonShape === "object",
  });

  const locked = Boolean(readOnly || disabled);
  const formatLabel = translate("chelone.action.format", { _: "Format" });
  const invalid = fieldState.invalid;
  const error = fieldState.error;

  return (
    <Field className={className} data-invalid={invalid || undefined}>
      {label !== false && (
        <FieldLabel htmlFor={id}>
          <FieldLabelText
            label={label}
            source={source}
            resource={resource}
            isRequired={isRequired}
          />
        </FieldLabel>
      )}
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-md border",
          editorClassName,
        )}
      >
        {showFormatButton && (
          <div className="flex justify-end border-b px-1 py-0.5">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-label={formatLabel}
              disabled={locked}
              onClick={() =>
                void instance?.getAction("editor.action.formatDocument")?.run()
              }
            >
              {formatLabel}
            </Button>
          </div>
        )}
        <div id={id} ref={container}>
          <Editor
            language="json"
            path={modelPath}
            value={text}
            theme={theme}
            height={autoHeight ? contentHeight : height}
            onChange={handleChange}
            onMount={(mountedEditor, mountedMonaco) => {
              setInstance(mountedEditor);
              setMonacoApi(mountedMonaco);
            }}
            options={{
              automaticLayout: false,
              minimap: { enabled: false },
              lineNumbers: "on",
              wordWrap: "on",
              tabSize: 2,
              readOnly: locked,
              ...monacoOptions,
            }}
          />
        </div>
      </div>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}
