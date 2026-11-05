import type { LooseRecord } from "@chelone/core";
import {
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
} from "@mdxeditor/editor";
import {
  memo,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../field-error-display";
import { useInput } from "../../form-hooks";
import { useResourceContext } from "../../resource";
import type { InputProps } from "../admin/input-props";
import { useResolvedTheme } from "../admin/layout/use-theme";
import { defaultInputPlugins } from "./default-plugins";
import { safeHtmlImagePlugin } from "./safe-html-image-plugin";
import "./mdx-editor-dark.css";

type MdxEditorPassthrough = Omit<
  MDXEditorProps,
  | "markdown"
  | "readOnly"
  | "spellCheck"
  | "onChange"
  | "onBlur"
  | "onError"
  | "ref"
>;

interface MdxInputProps<TRecord = LooseRecord>
  extends Omit<InputProps<TRecord>, "defaultValue"> {
  defaultValue?: unknown;
  className?: string;
  /**
   * Extra `MDXEditor` props. `plugins` here replaces `defaultInputPlugins`;
   * an inert `<img>` visitor is added to either list.
   * `suppressHtmlProcessing` defaults to `true`, so raw HTML stays text; set it
   * to `false` to render stored HTML live, where an
   * `<iframe src="javascript:...">` runs script as the editor mounts.
   */
  mdxProps?: MdxEditorPassthrough;
}

interface EditorProps {
  editorRef: RefObject<MDXEditorMethods | null>;
  initialMarkdown: string;
  readOnly: boolean;
  className?: string;
  mdxProps?: MdxEditorPassthrough;
  onChange: (markdown: string, initialMarkdownNormalize: boolean) => void;
  onBlur: (event: FocusEvent) => void;
  onError: () => void;
}

function shallowEqual(
  a: MdxEditorPassthrough | undefined,
  b: MdxEditorPassthrough | undefined,
) {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a) as (keyof MdxEditorPassthrough)[];
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every((key) => Object.is(a[key], b[key]));
}

// The editor is uncontrolled, so a re-render with the same inputs is wasted
// work and a re-mount of its plugins is worse: skip it.
const Editor = memo(function Editor({
  editorRef,
  initialMarkdown,
  readOnly,
  className,
  mdxProps,
  onChange,
  onBlur,
  onError,
}: EditorProps) {
  // Added to the caller's list too, so `imagePlugin()` cannot run the
  // `onerror` of raw `<img>` HTML.
  const basePlugins = mdxProps?.plugins ?? defaultInputPlugins;
  const plugins = useMemo(
    () => [...basePlugins, safeHtmlImagePlugin],
    [basePlugins],
  );
  return (
    <MDXEditor
      {...mdxProps}
      plugins={plugins}
      // After the spread, so a key set to `undefined` keeps the safe default.
      suppressHtmlProcessing={mdxProps?.suppressHtmlProcessing ?? true}
      ref={editorRef}
      markdown={initialMarkdown}
      readOnly={readOnly}
      className={cn(className, mdxProps?.className)}
      onChange={onChange}
      onBlur={onBlur}
      onError={onError}
    />
  );
}, editorPropsEqual);

function editorPropsEqual(prev: EditorProps, next: EditorProps) {
  return (
    prev.readOnly === next.readOnly &&
    prev.onChange === next.onChange &&
    prev.onBlur === next.onBlur &&
    prev.onError === next.onError &&
    prev.initialMarkdown === next.initialMarkdown &&
    prev.className === next.className &&
    shallowEqual(prev.mdxProps, next.mdxProps)
  );
}

/**
 * Edits a markdown string in an MDXEditor with a formatting toolbar.
 *
 * Needs the optional `@mdxeditor/editor` peer, and its stylesheet imported once
 * in the app (`@mdxeditor/editor/style.css`). The value is always a markdown
 * string; MDX with JSX is not parsed.
 *
 * @example
 * import { MdxInput } from "@chelone/react/mdx-editor";
 *
 * <MdxInput source="body" label="Notes" />
 */
function MdxInput<TRecord = LooseRecord>(props: MdxInputProps<TRecord>) {
  const {
    label,
    source,
    className,
    resource: resourceProp,
    helperText,
    disabled,
    readOnly,
    validate,
    isRequired: isRequiredProp,
    id: idProp,
    defaultValue,
    format,
    parse,
    onChange,
    onBlur,
    mdxProps,
  } = props;
  const resource = useResourceContext({ resource: resourceProp });
  const theme = useResolvedTheme();

  const { id, field, fieldState, isRequired } = useInput({
    source,
    validate,
    isRequired: isRequiredProp,
    id: idProp,
    defaultValue: defaultValue ?? "",
    format,
    // Identity, so clearing the editor stores "" and not null.
    parse: parse ?? ((value) => value),
    onChange,
  });

  const editorRef = useRef<MDXEditorMethods>(null);
  const value = typeof field.value === "string" ? field.value : "";

  // The editor reads `markdown` on mount only; a parent re-render must not reset it.
  const [initialMarkdown] = useState(value);

  // `field` is a new object per render; the editor gets handlers that stay put.
  const fieldRef = useRef(field);
  fieldRef.current = field;
  // On mount the editor re-serialises the starting markdown and reports it
  // with `initialMarkdownNormalize`; that is not an edit, so it stays out of the
  // form (no dirty state, no rewrite of stored markdown the user never touched).
  const handleChange = useCallback(
    (markdown: string, initialMarkdownNormalize: boolean) => {
      if (!initialMarkdownNormalize) fieldRef.current.onChange(markdown);
    },
    [],
  );
  // The editor reports a DOM blur, which is not the React event `field.onBlur`
  // takes, so the caller's `onBlur` is called here with the event it sent.
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;
  const handleBlur = useCallback((event: FocusEvent) => {
    fieldRef.current.onBlur();
    onBlurRef.current?.(event);
  }, []);

  // Markdown the editor cannot import (block HTML, once HTML processing is off)
  // is dropped from its content without a sign, and the next keystroke would
  // save that loss. The stored text goes in a plain textarea instead.
  const [parseFailed, setParseFailed] = useState(false);
  const handleError = useCallback(() => setParseFailed(true), []);

  // A reset or `setValue` changes the form value without the editor knowing.
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.getMarkdown() !== value) {
      editor.setMarkdown(value);
    }
  }, [value]);

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
      <div id={id}>
        {parseFailed ? (
          <Textarea
            data-slot="mdx-input-fallback"
            value={value}
            disabled={disabled === true}
            readOnly={readOnly === true}
            aria-invalid={invalid || undefined}
            onChange={(event) => field.onChange(event.target.value)}
            onBlur={(event) => field.onBlur(event)}
          />
        ) : (
          <Editor
            editorRef={editorRef}
            initialMarkdown={initialMarkdown}
            readOnly={disabled === true || readOnly === true}
            className={theme === "dark" ? "mdxeditor-dark" : undefined}
            mdxProps={mdxProps}
            onChange={handleChange}
            onBlur={handleBlur}
            onError={handleError}
          />
        )}
      </div>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

export { MdxInput, type MdxInputProps };
