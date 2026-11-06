import type { LooseRecord, SourceProp, SourceValue } from "@chelone/core";
import type { editor } from "monaco-editor";
import { lazy, Suspense } from "react";
import type { FieldProps } from "@/lib/field-types";
import { useFieldValue } from "../../record/use-field-value";
import { MonacoSkeleton } from "./internal/monaco-shared";

interface MonacoJsonFieldProps<RecordType extends LooseRecord = LooseRecord>
  extends FieldProps<RecordType> {
  /** Shown when the record has no value at `source`. */
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
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
function MonacoJsonField<RecordType extends LooseRecord = LooseRecord>(
  props: MonacoJsonFieldProps<RecordType>,
) {
  const {
    source,
    record,
    defaultValue,
    empty,
    height,
    autoHeight = true,
    maxHeight,
    className,
    monacoOptions,
  } = props;
  // Read through `LooseRecord`: the typed read is a `SourceValue` still deferred
  // on `RecordType`, which overflows the compiler when compared.
  const value = useFieldValue<LooseRecord>({
    source,
    record,
    defaultValue,
  });
  return (
    <Suspense
      fallback={
        <MonacoSkeleton
          height={autoHeight ? SKELETON_HEIGHT : (height ?? 200)}
          className={className}
        />
      }
    >
      <MonacoJsonFieldLazy
        value={value}
        empty={empty}
        height={height}
        autoHeight={autoHeight}
        maxHeight={maxHeight}
        className={className}
        monacoOptions={monacoOptions}
      />
    </Suspense>
  );
}

export { MonacoJsonField, type MonacoJsonFieldProps };
