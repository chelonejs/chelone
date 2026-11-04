import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import { useFieldValue } from "../../record/use-field-value";
import {
  useAutoHeight,
  useMonacoLayout,
  useMonacoTheme,
} from "./internal/monaco-shared";
import type { MonacoJsonFieldProps } from "./monaco-json-field";

// Serve the bundled copy instead of the binding's default CDN fetch.
loader.config({ monaco });

const MIN_HEIGHT = 120;
const DEFAULT_HEIGHT = 200;
const DEFAULT_MAX_HEIGHT = 400;

function toText(value: unknown): string {
  return typeof value === "string"
    ? value
    : JSON.stringify(value ?? null, null, 2);
}

/** The only file that imports `monaco-editor` at run time. */
export default function MonacoJsonFieldLazy({
  source,
  record,
  empty,
  defaultValue,
  height = DEFAULT_HEIGHT,
  autoHeight = true,
  maxHeight = DEFAULT_MAX_HEIGHT,
  className,
  monacoOptions,
}: MonacoJsonFieldProps) {
  const value: unknown = useFieldValue({ source, record, defaultValue });
  const translate = useTranslate();
  const container = useRef<HTMLDivElement>(null);
  const [instance, setInstance] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const theme = useMonacoTheme();
  const contentHeight = useAutoHeight(
    instance,
    autoHeight,
    MIN_HEIGHT,
    maxHeight,
  );
  useMonacoLayout(instance, container);

  if (value == null && empty) {
    return (
      <span className={className}>
        {typeof empty === "string" ? translate(empty, { _: empty }) : empty}
      </span>
    );
  }

  return (
    <div
      ref={container}
      className={cn("overflow-hidden rounded-md border", className)}
    >
      <Editor
        language="json"
        value={toText(value)}
        theme={theme}
        height={autoHeight ? contentHeight : height}
        onMount={setInstance}
        options={{
          readOnly: true,
          domReadOnly: true,
          automaticLayout: false,
          minimap: { enabled: false },
          lineNumbers: "on",
          wordWrap: "on",
          tabSize: 2,
          ...monacoOptions,
        }}
      />
    </div>
  );
}
