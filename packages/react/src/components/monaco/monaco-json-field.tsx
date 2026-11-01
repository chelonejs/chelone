import type { editor } from "monaco-editor";
import { lazy, Suspense } from "react";
import type { FieldProps } from "@/lib/field-types";
import type { UnknownRecord } from "@/lib/unknown-types";
import { MonacoSkeleton } from "./internal/monaco-shared";

interface MonacoJsonFieldProps<RecordType extends UnknownRecord = UnknownRecord>
  extends FieldProps<RecordType> {
  /** Shown when the record has no value at `source`. */
  defaultValue?: unknown;
  /** Editor height in pixels when `autoHeight` is false. Defaults to 200. */
  height?: number;
  /** Grow with the content up to `maxHeight`. Defaults to true. */
  autoHeight?: boolean;
  /** Tallest the editor grows to when `autoHeight` is on. Defaults to 400. */
  maxHeight?: number;
  /** Merged over the read-only defaults, so it can override any of them. */
  monacoOptions?: editor.IStandaloneEditorConstructionOptions;
}

const MonacoJsonFieldLazy = lazy(() => import("./monaco-json-field-lazy"));

const SKELETON_HEIGHT = 120;

/**
 * Shows a JSON (or JSON-string) field value in a read-only Monaco editor.
 *
 * Monaco loads in a separate chunk on first render, so the base bundle carries
 * nothing. Needs the optional `monaco-editor` and `@monaco-editor/react` peers.
 *
 * @example
 * import { MonacoJsonField } from "@chelone/react/monaco";
 *
 * <MonacoJsonField source="metadata" />
 */
function MonacoJsonField<RecordType extends UnknownRecord = UnknownRecord>(
  props: MonacoJsonFieldProps<RecordType>,
) {
  const { autoHeight = true, height } = props;
  return (
    <Suspense
      fallback={
        <MonacoSkeleton
          height={autoHeight ? SKELETON_HEIGHT : (height ?? 200)}
          className={props.className}
        />
      }
    >
      <MonacoJsonFieldLazy {...(props as MonacoJsonFieldProps)} />
    </Suspense>
  );
}

export { MonacoJsonField, type MonacoJsonFieldProps };
