import {
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  type RealmPlugin,
} from "@mdxeditor/editor";
import { useEffect, useRef } from "react";
import type { FieldProps } from "@/lib/field-types";
import type { UnknownRecord } from "@/lib/unknown-types";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import { useFieldValue } from "../../record/use-field-value";
import { sanitizeFieldRestProps } from "../../util/sanitize-field-rest-props";
import { useResolvedTheme } from "../admin/layout/use-theme";
import { defaultFieldPlugins } from "./default-plugins";
import "./mdx-editor-dark.css";

interface MdxFieldProps<RecordType extends UnknownRecord = UnknownRecord>
  extends FieldProps<RecordType>,
    Omit<MDXEditorProps, "markdown" | "readOnly" | "ref"> {
  /** The editor plugins. Defaults to `defaultFieldPlugins`. */
  plugins?: RealmPlugin[];
}

/**
 * Renders a markdown field value in a read-only MDXEditor.
 *
 * Needs the optional `@mdxeditor/editor` peer, and its stylesheet imported once
 * in the app (`@mdxeditor/editor/style.css`).
 *
 * @example
 * import { MdxField } from "@chelone/react/mdx-editor";
 *
 * <MdxField source="body" empty="No content" />
 */
function MdxField<RecordType extends UnknownRecord = UnknownRecord>({
  source,
  record,
  empty,
  className,
  plugins = defaultFieldPlugins,
  ...rest
}: MdxFieldProps<RecordType>) {
  const value = useFieldValue({ source, record });
  const translate = useTranslate();
  const theme = useResolvedTheme();
  const editorRef = useRef<MDXEditorMethods>(null);

  const emptyIsText = typeof empty === "string";
  const markdown =
    value == null
      ? emptyIsText
        ? translate(empty, { _: empty })
        : ""
      : typeof value === "string"
        ? value
        : String(value);

  // The editor takes `markdown` only on mount, so later values are pushed in.
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.getMarkdown() !== markdown) {
      editor.setMarkdown(markdown);
    }
  }, [markdown]);

  if (value == null && empty && !emptyIsText) return <>{empty}</>;

  return (
    <MDXEditor
      {...sanitizeFieldRestProps(rest)}
      ref={editorRef}
      markdown={markdown}
      readOnly
      plugins={plugins}
      className={cn(theme === "dark" && "mdxeditor-dark", className)}
    />
  );
}

export { MdxField, type MdxFieldProps };
