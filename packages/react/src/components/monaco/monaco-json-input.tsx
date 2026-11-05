import type { LooseRecord } from "@chelone/core";
import type { editor } from "monaco-editor";
import { lazy, Suspense } from "react";
import type { InputProps } from "../admin/input-props";
import { MonacoSkeleton } from "./internal/monaco-shared";

interface MonacoJsonInputProps<TRecord = LooseRecord>
  extends Omit<InputProps<TRecord>, "defaultValue"> {
  /** Input-level default, ra precedence (seeds only into an untouched hole). */
  defaultValue?: unknown;
  /** A JSON Schema the value is checked against. Object shape only. */
  schema?: object;
  /** A schema Monaco fetches from this URL. Ignored when `schema` is set. */
  schemaUri?: string;
  /** Tolerate comments and trailing commas in the text. */
  allowComments?: boolean;
  /** Grow with the content between `minHeight` and `maxHeight`. Defaults to false. */
  autoHeight?: boolean;
  /** Editor height in pixels when `autoHeight` is false. Defaults to 300. */
  height?: number;
  /** Shortest the editor gets when `autoHeight` is on. Defaults to 120. */
  minHeight?: number;
  /** Tallest the editor grows to when `autoHeight` is on. Defaults to 600. */
  maxHeight?: number;
  /** Show the Format button. Defaults to true. */
  showFormatButton?: boolean;
  /** Class for the field wrapper. */
  className?: string;
  /** Class for the editor frame. */
  editorClassName?: string;
  /** Merged over the editor defaults, so it can override any of them. */
  monacoOptions?: editor.IStandaloneEditorConstructionOptions;
}

const MonacoJsonInputLazy = lazy(() => import("./monaco-json-input-lazy"));

/**
 * Edits a JSON value in Monaco, with JSON Schema checks and error markers.
 *
 * A value that starts as a string stays a string and is written back as
 * typed; any other value is edited as JSON and written back parsed. While the
 * text is not valid JSON the form keeps the last valid value. A Monaco error
 * marker blocks submit.
 *
 * Monaco loads in a separate chunk on first render, so the base bundle carries
 * nothing. Needs the optional `monaco-editor` and `@monaco-editor/react` peers.
 *
 * @example
 * import { MonacoJsonInput } from "@chelone/react/monaco";
 *
 * <MonacoJsonInput source="settings" schema={settingsSchema} />
 */
function MonacoJsonInput<TRecord = LooseRecord>(
  props: MonacoJsonInputProps<TRecord>,
) {
  const { autoHeight = false, height, minHeight } = props;
  return (
    <Suspense
      fallback={
        <MonacoSkeleton
          height={autoHeight ? (minHeight ?? 120) : (height ?? 300)}
          className={props.className}
        />
      }
    >
      <MonacoJsonInputLazy {...props} />
    </Suspense>
  );
}

export { MonacoJsonInput, type MonacoJsonInputProps };
