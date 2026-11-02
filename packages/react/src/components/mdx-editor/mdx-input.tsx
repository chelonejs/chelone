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
  useRef,
  useState,
} from "react";
import { FieldLabelText } from "@/components/admin/common/field-label-text";
import { InputHelperText } from "@/components/admin/common/input-helper-text";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ValidationError } from "../../field-error-display";
import { useInput } from "../../form-hooks";
import { useResourceContext } from "../../resource";
import type { InputProps } from "../admin/input-props";
import { useResolvedTheme } from "../admin/layout/use-theme";
import { defaultInputPlugins } from "./default-plugins";
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

interface MdxInputProps extends InputProps {
  className?: string;
  /** Extra `MDXEditor` props. `plugins` here replaces `defaultInputPlugins`. */
  mdxProps?: MdxEditorPassthrough;
}

interface EditorProps {
  editorRef: RefObject<MDXEditorMethods | null>;
  initialMarkdown: string;
  readOnly: boolean;
  className?: string;
  mdxProps?: MdxEditorPassthrough;
  onChange: (markdown: string) => void;
  onBlur: (event: FocusEvent) => void;
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
}: EditorProps) {
  return (
    <MDXEditor
      plugins={defaultInputPlugins}
      {...mdxProps}
      ref={editorRef}
      markdown={initialMarkdown}
      readOnly={readOnly}
      className={cn(className, mdxProps?.className)}
      onChange={onChange}
      onBlur={onBlur}
    />
  );
}, editorPropsEqual);

function editorPropsEqual(prev: EditorProps, next: EditorProps) {
  return (
    prev.readOnly === next.readOnly &&
    prev.onChange === next.onChange &&
    prev.onBlur === next.onBlur &&
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
function MdxInput(props: MdxInputProps) {
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
    onBlur,
  });

  const editorRef = useRef<MDXEditorMethods>(null);
  const value = typeof field.value === "string" ? field.value : "";

  // The editor reads `markdown` on mount only; a parent re-render must not reset it.
  const [initialMarkdown] = useState(value);

  // `field` is a new object per render; the editor gets handlers that stay put.
  const fieldRef = useRef(field);
  fieldRef.current = field;
  const handleChange = useCallback(
    (markdown: string) => fieldRef.current.onChange(markdown),
    [],
  );
  const handleBlur = useCallback(
    (event: FocusEvent) => fieldRef.current.onBlur(event),
    [],
  );

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
        <Editor
          editorRef={editorRef}
          initialMarkdown={initialMarkdown}
          readOnly={disabled === true || readOnly === true}
          className={theme === "dark" ? "mdxeditor-dark" : undefined}
          mdxProps={mdxProps}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </div>
      <InputHelperText helperText={helperText} />
      <FieldError>
        {invalid && error ? <ValidationError error={error} /> : null}
      </FieldError>
    </Field>
  );
}

export { MdxInput, type MdxInputProps };
