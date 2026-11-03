import {
  composeValidators,
  detectJsonShape,
  fromJsonText,
  type JsonShape,
  stripJsonComments,
  toJsonText,
} from "@chelone/core";
import Editor, { loader } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import * as monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../field-error-display";
import { useCheloneFormContext } from "../../form-context";
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
  format,
  parse,
  onChange,
  onBlur: onBlurProp,
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
  const checking = useRef(0);
  const hadError = useRef(false);
  const { markers, settled } = useMonacoMarkers(
    instance,
    monacoApi,
    (changed) => {
      const hasError = changed.some((m) => m.severity >= ERROR_SEVERITY);
      if (hasError === hadError.current) return;
      hadError.current = hasError;
      // A check waiting on `settled` reads these markers itself, and a rewrite
      // now would cancel it mid-flight, letting the submit it belongs to pass.
      if (checking.current > 0) return;
      revalidate.current();
    },
  );

  // The text on screen, kept current outside render so the validator sees it.
  const textRef = useRef("");
  const shape = useRef<JsonShape | null>(null);
  const parseText = (text: string, textShape: JsonShape) =>
    fromJsonText(
      allowComments && textShape === "object" ? stripJsonComments(text) : text,
      textShape,
    );

  // A save waits out Monaco's diagnostics delay so a schema error from the
  // last edit is in the list before it is read. Re-checks while typing read
  // what is there: waiting would hold a cleared error on screen and block Save.
  const { form } = useCheloneFormContext();
  const firstError = (list: editor.IMarker[]) =>
    list.find((marker) => marker.severity >= ERROR_SEVERITY)?.message;
  const markerCheck = async () => {
    if (!form.state.isSubmitting) return firstError(markers.current);
    checking.current++;
    try {
      return firstError(await settled());
    } finally {
      checking.current--;
    }
  };
  // Monaco's markers lag the text by its diagnostics delay, so the text's own
  // parse error is checked too: a stale marker list must not let bad text save.
  const syntaxCheck = () => {
    if (shape.current === "string") return undefined;
    const { parseError } = parseText(textRef.current, "object");
    return parseError
      ? translate("chelone.validation.invalid_json", {
          _: "Invalid JSON: %{message}",
          message: parseError.message,
        })
      : undefined;
  };
  const validator = composeValidators(
    markerCheck,
    syntaxCheck,
    ...(Array.isArray(validate) ? validate : validate ? [validate] : []),
  );

  const { id, field, fieldState, isRequired } = useInput({
    source,
    validate: validator,
    isRequired: isRequiredProp,
    id: idProp,
    defaultValue,
    format: format ?? identity,
    parse: parse ?? identity,
    onBlur: onBlurProp,
  });
  // `field.onChange` reads an object with a `target.value` as a DOM event, and
  // a JSON value can look like one, so the value goes in as a synthetic event.
  const write = (value: unknown) => field.onChange({ target: { value } });
  revalidate.current = () => {
    if (fieldState.isDirty) write(field.value);
  };

  shape.current ??= detectJsonShape(field.value);
  const jsonShape = shape.current ?? "object";

  // The editor owns the text while the user types. It is only rebuilt from
  // the form when the form's value changed to something the text doesn't say.
  const [text, setText] = useState(() => toJsonText(field.value, jsonShape));
  const lastValue = useRef(field.value);
  if (field.value !== lastValue.current) {
    lastValue.current = field.value;
    const typed = parseText(text, jsonShape);
    const sameAsText =
      !typed.parseError &&
      toJsonText(typed.value, jsonShape) === toJsonText(field.value, jsonShape);
    if (!sameAsText) setText(toJsonText(field.value, jsonShape));
  }
  textRef.current = text;

  const handleChange = (next: string | undefined) => {
    const nextText = next ?? "";
    setText(nextText);
    textRef.current = nextText;
    // Editing an empty form value starts in object shape; a string typed as
    // `"abc"` is then a JSON string, not a reason to treat the field as text.
    shape.current ??= "object";
    const { value, parseError } = parseText(nextText, jsonShape);
    if (parseError) return;
    write(value);
    onChange?.(value);
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
