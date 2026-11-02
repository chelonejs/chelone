import {
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  type RealmPlugin,
} from "@mdxeditor/editor";
import { useEffect, useRef, useState } from "react";
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
  /**
   * Keeps raw HTML in the markdown as text. Defaults to `true`, since a field
   * shows records other people wrote. Pass `false` to render stored HTML live:
   * an `<iframe src="javascript:...">` then runs script as the field mounts, and
   * a `javascript:` link runs on click.
   */
  suppressHtmlProcessing?: boolean;
}

/**
 * Renders a markdown field value in a read-only MDXEditor.
 *
 * Needs the optional `@mdxeditor/editor` peer, and its stylesheet imported once
 * in the app (`@mdxeditor/editor/style.css`). From npm, also import
 * `@chelone/react/mdx-editor.css` for the dark theme; the registry item ships
 * that file with the component.
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
  suppressHtmlProcessing = true,
  onError,
  ...rest
}: MdxFieldProps<RecordType>) {
  const value = useFieldValue({ source, record });
  const translate = useTranslate();
  const theme = useResolvedTheme();
  const editorRef = useRef<MDXEditorMethods>(null);
  // The markdown the editor failed to parse. A different value gets a new try.
  const [failedMarkdown, setFailedMarkdown] = useState<string | null>(null);

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

  // On a parse error MDXEditor renders nothing, so show the value as text.
  if (failedMarkdown === markdown) {
    return (
      <pre
        data-slot="mdx-field-fallback"
        className={cn("whitespace-pre-wrap break-words text-sm", className)}
      >
        {markdown}
      </pre>
    );
  }

  return (
    <MDXEditor
      {...sanitizeFieldRestProps(rest)}
      ref={editorRef}
      markdown={markdown}
      readOnly
      plugins={plugins}
      suppressHtmlProcessing={suppressHtmlProcessing}
      onError={(payload) => {
        setFailedMarkdown(markdown);
        onError?.(payload);
      }}
      className={cn(theme === "dark" && "mdxeditor-dark", className)}
    />
  );
}

export { MdxField, type MdxFieldProps };
